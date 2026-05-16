import { Injectable } from "@nestjs/common";
import { htmlToText } from "html-to-text";
import mjml2html from "mjml";
import sanitizeHtml from "sanitize-html";

type ValidationIssue = {
    field: string;
    code: string;
    message: string;
};

type CompileTemplateInput = {
    editorType: "MJML" | "HTML";
    subject: string;
    markupSource: string;
    textBodySource?: string | null;
    allowedVariables: string[];
    requiredVariables: string[];
    sampleVariables?: Record<string, unknown> | null;
    strictRequired?: boolean;
};

type RenderStoredTemplateInput = {
    subject: string;
    htmlBody: string;
    textBody: string;
    requiredVariables: string[];
    variables?: Record<string, unknown> | null;
};

const TOKEN_REGEX =
    /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}|\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}/g;

@Injectable()
export class EmailTemplateRendererService {
    private normalizeValue(value: unknown) {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    private sanitizeHeaderValue(value?: string | null) {
        return String(value || "")
            .replace(/[\r\n]+/g, " ")
            .trim();
    }

    private normalizeSampleVariables(
        value?: Record<string, unknown> | null,
    ): Record<string, string> {
        const result: Record<string, string> = {};

        if (!value || typeof value !== "object") {
            return result;
        }

        for (const [key, rawValue] of Object.entries(value)) {
            result[key] = this.normalizeValue(rawValue);
        }

        return result;
    }

    private parsePlaceholders(source: string) {
        const names = new Set<string>();
        const text = String(source || "");

        let match: RegExpExecArray | null;
        while ((match = TOKEN_REGEX.exec(text)) !== null) {
            const key = String(match[1] || match[2] || "").trim();
            if (key) {
                names.add(key);
            }
        }

        TOKEN_REGEX.lastIndex = 0;
        return [...names];
    }

    private renderText(source: string, values: Record<string, string>) {
        return String(source || "").replace(
            TOKEN_REGEX,
            (_full, key1, key2) => {
                const key = String(key1 || key2 || "").trim();
                const value = values[key];
                if (!value) {
                    return `[[missing: ${key}]]`;
                }
                return value;
            },
        );
    }

    private renderHtml(source: string, values: Record<string, string>) {
        return String(source || "").replace(
            TOKEN_REGEX,
            (_full, key1, key2) => {
                const key = String(key1 || key2 || "").trim();
                const value = values[key];
                const safeValue = value
                    ? this.escapeHtml(value).replace(/\r?\n/g, "<br />")
                    : `[[missing: ${this.escapeHtml(key)}]]`;

                return safeValue;
            },
        );
    }

    private sanitizeCompiledHtml(html: string) {
        return sanitizeHtml(String(html || ""), {
            allowedTags: [
                "html",
                "head",
                "body",
                "meta",
                "title",
                "style",
                "div",
                "span",
                "p",
                "br",
                "strong",
                "em",
                "u",
                "small",
                "table",
                "thead",
                "tbody",
                "tfoot",
                "tr",
                "td",
                "th",
                "img",
                "a",
                "ul",
                "ol",
                "li",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
            ],
            allowedAttributes: {
                "*": [
                    "style",
                    "class",
                    "align",
                    "valign",
                    "width",
                    "height",
                    "role",
                    "bgcolor",
                ],
                a: ["href", "target", "rel", "name", "title", "style"],
                img: [
                    "src",
                    "alt",
                    "width",
                    "height",
                    "style",
                    "border",
                ],
                table: [
                    "width",
                    "border",
                    "cellpadding",
                    "cellspacing",
                    "role",
                    "style",
                ],
                td: ["width", "height", "colspan", "rowspan", "style", "align", "valign"],
                th: ["width", "height", "colspan", "rowspan", "style", "align", "valign"],
                meta: ["http-equiv", "content", "charset"],
            },
            allowedSchemes: ["http", "https", "mailto", "data"],
            allowedSchemesByTag: {
                img: ["http", "https", "data"],
                a: ["http", "https", "mailto"],
            },
            disallowedTagsMode: "discard",
        });
    }

    compileTemplateVersion(input: CompileTemplateInput) {
        const errors: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        const normalizedVariables = this.normalizeSampleVariables(
            input.sampleVariables,
        );

        const detectedVariables = [
            ...new Set([
                ...this.parsePlaceholders(input.subject),
                ...this.parsePlaceholders(input.markupSource),
                ...this.parsePlaceholders(input.textBodySource || ""),
            ]),
        ];

        const unknownVariables = detectedVariables.filter(
            (name) =>
                input.allowedVariables.length > 0 &&
                !input.allowedVariables.includes(name),
        );

        if (unknownVariables.length > 0) {
            errors.push({
                field: "variables",
                code: "UNKNOWN_VARIABLES",
                message: `Unknown template variables: ${unknownVariables.join(", ")}`,
            });
        }

        const missingRequiredVariables = input.requiredVariables.filter((name) => {
            const value = normalizedVariables[name];
            return !String(value || "").trim();
        });

        if (input.strictRequired && missingRequiredVariables.length > 0) {
            errors.push({
                field: "variables",
                code: "MISSING_REQUIRED_VARIABLES",
                message: `Missing required variables: ${missingRequiredVariables.join(", ")}`,
            });
        } else if (!input.strictRequired && missingRequiredVariables.length > 0) {
            warnings.push({
                field: "variables",
                code: "MISSING_REQUIRED_VARIABLES",
                message: `Missing required variables for preview/test data: ${missingRequiredVariables.join(", ")}`,
            });
        }

        let compiledHtml = "";
        if (input.editorType === "MJML") {
            const result = mjml2html(input.markupSource, {
                validationLevel: "soft",
                keepComments: false,
            });

            compiledHtml = result.html ?? "";

            if (Array.isArray(result.errors) && result.errors.length > 0) {
                for (const issue of result.errors) {
                    errors.push({
                        field: "markupSource",
                        code: "MJML_COMPILE_ERROR",
                        message: String(issue.formattedMessage || issue.message || "MJML compile error."),
                    });
                }
            }
        } else {
            compiledHtml = input.markupSource;
        }

        const sanitizedCompiledHtml = this.sanitizeCompiledHtml(compiledHtml);
        if (sanitizedCompiledHtml !== compiledHtml) {
            warnings.push({
                field: "markupSource",
                code: "HTML_SANITIZED",
                message: "Unsafe or unsupported HTML was removed during sanitization.",
            });
        }

        const textBodyCompiled =
            String(input.textBodySource || "").trim() ||
            htmlToText(sanitizedCompiledHtml, {
                wordwrap: 120,
                selectors: [
                    { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
                    { selector: "img", format: "skip" },
                ],
            });

        const renderedSubject = this.sanitizeHeaderValue(
            this.renderText(input.subject, normalizedVariables),
        );
        const renderedHtml = this.renderHtml(
            sanitizedCompiledHtml,
            normalizedVariables,
        );
        const renderedText = this.renderText(
            textBodyCompiled,
            normalizedVariables,
        );

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            detectedVariables,
            unknownVariables,
            missingRequiredVariables,
            compiledHtml: sanitizedCompiledHtml,
            compiledText: textBodyCompiled,
            renderedSubject,
            renderedHtml,
            renderedText,
        };
    }

    renderStoredTemplate(input: RenderStoredTemplateInput) {
        const values = this.normalizeSampleVariables(input.variables);

        const missingRequiredVariables = input.requiredVariables.filter((name) => {
            const value = values[name];
            return !String(value || "").trim();
        });

        return {
            missingRequiredVariables,
            renderedSubject: this.sanitizeHeaderValue(
                this.renderText(input.subject, values),
            ),
            renderedHtml: this.renderHtml(input.htmlBody, values),
            renderedText: this.renderText(input.textBody, values),
        };
    }
}