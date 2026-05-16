import type { EmailCategory } from "@prisma/client";

export type EmailTemplateEditorTypeValue = "MJML" | "HTML";

export type EmailTemplateVariableDefinition = {
    name: string;
    description: string;
    required: boolean;
    example?: string;
};

export type EmailTemplateCatalogEntry = {
    key: EmailCategory;
    category: EmailCategory;
    name: string;
    description: string;
    defaultEditorType: EmailTemplateEditorTypeValue;
    defaultSubject: string;
    variables: EmailTemplateVariableDefinition[];
    defaultMjml: string;
    defaultHtml: string;
};

function buildMjmlShell(title: string, bodyHtml: string) {
    return `<mjml>
  <mj-head>
    <mj-preview>${title}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, Helvetica, sans-serif" />
      <mj-text color="#111111" font-size="15px" line-height="1.7" />
      <mj-button background-color="#f59e0b" color="#111111" border-radius="10px" font-weight="700" />
      <mj-section padding="0" />
      <mj-column padding="0" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f5">
    <mj-section padding="24px">
      <mj-column>
        <mj-wrapper background-color="#111111" border-radius="24px 24px 0 0" padding="24px">
          <mj-section>
            <mj-column>
              <mj-text color="#f59e0b" font-size="12px" font-weight="700" text-transform="uppercase" letter-spacing="1px">
                SparkzLive
              </mj-text>
              <mj-text color="#ffffff" font-size="28px" font-weight="700">
                ${title}
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-wrapper>

        <mj-wrapper background-color="#ffffff" border-radius="0 0 24px 24px" padding="24px">
          <mj-section>
            <mj-column>
              <mj-text>${bodyHtml}</mj-text>
            </mj-column>
          </mj-section>
        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}

function buildHtmlShell(title: string, bodyHtml: string) {
    return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:24px;background:#111111;">
          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#f59e0b;">SparkzLive</div>
          <div style="margin-top:8px;font-size:28px;font-weight:700;color:#ffffff;">${title}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;font-size:15px;line-height:1.7;color:#111111;">
          ${bodyHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const identityVariables: EmailTemplateVariableDefinition[] = [
    {
        name: "displayName",
        description: "The recipient display name.",
        required: false,
        example: "Joseph",
    },
    {
        name: "email",
        description: "The recipient email address.",
        required: false,
        example: "user@example.com",
    },
    {
        name: "username",
        description: "The recipient username.",
        required: false,
        example: "sparkzuser",
    },
];

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateCatalogEntry[] = [
    {
        key: "AUTH_VERIFY_EMAIL",
        category: "AUTH_VERIFY_EMAIL",
        name: "Verify Email",
        description: "Verification email sent during signup or re-verification.",
        defaultEditorType: "MJML",
        defaultSubject: "Verify your SparkzLive email",
        variables: [
            ...identityVariables,
            {
                name: "userId",
                description: "Internal user id.",
                required: false,
                example: "9b7c7f9f-1111-2222-3333-444444444444",
            },
            {
                name: "publicId",
                description: "Public SparkzLive user id.",
                required: false,
                example: "SPZ1234567890",
            },
            {
                name: "token",
                description: "Raw verification token.",
                required: false,
                example: "opaque-token-value",
            },
            {
                name: "verifyUrl",
                description: "Full verification URL.",
                required: true,
                example: "https://sparkzlive.com/verify?token=abc",
            },
            {
                name: "expiresAt",
                description: "Expiration timestamp for the verification link.",
                required: false,
                example: "2026-04-14T23:30:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Verify your email",
            `Hey {displayName},<br /><br />Thanks for joining SparkzLive. Use the button below to verify your email address.<br /><br /><a href="{verifyUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Verify email</a><br /><br />If you did not create this account, you can safely ignore this email.`,
        ),
        defaultHtml: buildHtmlShell(
            "Verify your email",
            `<p>Hey {displayName},</p><p>Thanks for joining SparkzLive. Use the button below to verify your email address.</p><p><a href="{verifyUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Verify email</a></p><p>If you did not create this account, you can safely ignore this email.</p>`,
        ),
    },
    {
        key: "AUTH_PASSWORD_RESET",
        category: "AUTH_PASSWORD_RESET",
        name: "Password Reset",
        description: "Password reset email.",
        defaultEditorType: "MJML",
        defaultSubject: "Reset your SparkzLive password",
        variables: [
            ...identityVariables,
            {
                name: "userId",
                description: "Internal user id.",
                required: false,
                example: "9b7c7f9f-1111-2222-3333-444444444444",
            },
            {
                name: "publicId",
                description: "Public SparkzLive user id.",
                required: false,
                example: "SPZ1234567890",
            },
            {
                name: "token",
                description: "Raw password reset token.",
                required: false,
                example: "opaque-token-value",
            },
            {
                name: "resetUrl",
                description: "Full password reset URL.",
                required: true,
                example: "https://sparkzlive.com/reset-password?token=abc",
            },
            {
                name: "expiresAt",
                description: "Expiration timestamp for the reset link.",
                required: false,
                example: "2026-04-14T23:30:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Reset your password",
            `Hey {displayName},<br /><br />We received a request to reset your password. Use the secure link below to continue.<br /><br /><a href="{resetUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Reset password</a><br /><br />If you did not request this, you can ignore this email.`,
        ),
        defaultHtml: buildHtmlShell(
            "Reset your password",
            `<p>Hey {displayName},</p><p>We received a request to reset your password. Use the secure link below to continue.</p><p><a href="{resetUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
        ),
    },
    {
        key: "AUTH_EMAIL_CHANGE_VERIFY",
        category: "AUTH_EMAIL_CHANGE_VERIFY",
        name: "Verify Email Change",
        description: "Verification email for email change requests.",
        defaultEditorType: "MJML",
        defaultSubject: "Confirm your SparkzLive email change",
        variables: [
            ...identityVariables,
            {
                name: "currentEmail",
                description: "The current email address before the change is confirmed.",
                required: false,
                example: "old-email@example.com",
            },
            {
                name: "userId",
                description: "Internal user id.",
                required: false,
                example: "9b7c7f9f-1111-2222-3333-444444444444",
            },
            {
                name: "publicId",
                description: "Public SparkzLive user id.",
                required: false,
                example: "SPZ1234567890",
            },
            {
                name: "token",
                description: "Raw verification token.",
                required: false,
                example: "opaque-token-value",
            },
            {
                name: "verifyUrl",
                description: "Full verification URL for the email change flow.",
                required: true,
                example: "https://sparkzlive.com/verify-email-change?token=abc",
            },
            {
                name: "expiresAt",
                description: "Expiration timestamp for the verification link.",
                required: false,
                example: "2026-04-14T23:30:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Confirm your email change",
            `Hey {displayName},<br /><br />We received a request to change the email address on your SparkzLive account.<br /><br /><a href="{verifyUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Confirm change</a>`,
        ),
        defaultHtml: buildHtmlShell(
            "Confirm your email change",
            `<p>Hey {displayName},</p><p>We received a request to change the email address on your SparkzLive account.</p><p><a href="{verifyUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Confirm change</a></p>`,
        ),
    },
    {
        key: "ACCOUNT_CREATED",
        category: "ACCOUNT_CREATED",
        name: "Account Created",
        description: "Welcome email after successful account creation.",
        defaultEditorType: "MJML",
        defaultSubject: "Welcome to SparkzLive",
        variables: [
            ...identityVariables,
            {
                name: "userId",
                description: "Internal user id.",
                required: false,
                example: "9b7c7f9f-1111-2222-3333-444444444444",
            },
            {
                name: "publicId",
                description: "Public SparkzLive user id.",
                required: false,
                example: "SPZ1234567890",
            },
            {
                name: "createdAt",
                description: "Account creation timestamp.",
                required: false,
                example: "2026-04-14T10:52:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Welcome to SparkzLive",
            `Hey {displayName},<br /><br />Your SparkzLive account is live and ready to go. We are excited to have you here.`,
        ),
        defaultHtml: buildHtmlShell(
            "Welcome to SparkzLive",
            `<p>Hey {displayName},</p><p>Your SparkzLive account is live and ready to go. We are excited to have you here.</p>`,
        ),
    },
    {
        key: "ACCOUNT_DELETED",
        category: "ACCOUNT_DELETED",
        name: "Account Deleted",
        description: "Confirmation that an account was deleted.",
        defaultEditorType: "MJML",
        defaultSubject: "Your SparkzLive account was deleted",
        variables: [
            ...identityVariables,
            {
                name: "deletedAt",
                description: "Account deletion timestamp.",
                required: false,
                example: "2026-04-14T10:52:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Account deleted",
            `Hey {displayName},<br /><br />This email confirms that your SparkzLive account was deleted.`,
        ),
        defaultHtml: buildHtmlShell(
            "Account deleted",
            `<p>Hey {displayName},</p><p>This email confirms that your SparkzLive account was deleted.</p>`,
        ),
    },
    {
        key: "BAN_APPEAL_RECEIVED",
        category: "BAN_APPEAL_RECEIVED",
        name: "Ban Appeal Received",
        description: "Acknowledgement that a ban appeal was received.",
        defaultEditorType: "MJML",
        defaultSubject: "We received your SparkzLive ban appeal",
        variables: [
            ...identityVariables,
            {
                name: "appealId",
                description: "Appeal identifier.",
                required: true,
                example: "BA-1029",
            },
            {
                name: "appealMessage",
                description: "Appeal message submitted by the user.",
                required: false,
                example: "I believe this enforcement was made in error.",
            },
            {
                name: "contactNote",
                description: "Optional contact note from the user.",
                required: false,
                example: "You can reach me at this email if needed.",
            },
            {
                name: "banReason",
                description: "Snapshot of the original ban reason.",
                required: false,
                example: "Harassment",
            },
            {
                name: "banIssuedAt",
                description: "Timestamp when the ban was issued.",
                required: false,
                example: "2026-04-13T18:00:00.000Z",
            },
            {
                name: "banExpiresAt",
                description: "Timestamp when the ban expires, if any.",
                required: false,
                example: "2026-05-13T18:00:00.000Z",
            },
            {
                name: "status",
                description: "Current appeal status.",
                required: false,
                example: "PENDING",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Ban appeal received",
            `Hey {displayName},<br /><br />We received your ban appeal.<br /><br /><strong>Appeal ID:</strong> {appealId}<br /><br />Our team will review it and contact you when a decision is made.`,
        ),
        defaultHtml: buildHtmlShell(
            "Ban appeal received",
            `<p>Hey {displayName},</p><p>We received your ban appeal.</p><p><strong>Appeal ID:</strong> {appealId}</p><p>Our team will review it and contact you when a decision is made.</p>`,
        ),
    },
    {
        key: "BAN_APPEAL_APPROVED",
        category: "BAN_APPEAL_APPROVED",
        name: "Ban Appeal Approved",
        description: "Decision email when a ban appeal is approved.",
        defaultEditorType: "MJML",
        defaultSubject: "Your SparkzLive ban appeal was approved",
        variables: [
            ...identityVariables,
            {
                name: "appealId",
                description: "Appeal identifier.",
                required: true,
                example: "BA-1029",
            },
            {
                name: "decisionNotes",
                description: "Admin decision notes shown to the user.",
                required: false,
                example: "Your appeal was approved after review.",
            },
            {
                name: "reviewedAt",
                description: "Timestamp when the appeal was reviewed.",
                required: false,
                example: "2026-04-14T15:00:00.000Z",
            },
            {
                name: "status",
                description: "Current appeal status.",
                required: false,
                example: "APPROVED",
            },
            {
                name: "banReason",
                description: "Snapshot of the original ban reason.",
                required: false,
                example: "Harassment",
            },
            {
                name: "contactNote",
                description: "Optional contact note from the user.",
                required: false,
                example: "Please contact me if more info is needed.",
            },
            {
                name: "appealMessage",
                description: "Appeal message submitted by the user.",
                required: false,
                example: "I believe this enforcement was made in error.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Ban appeal approved",
            `Hey {displayName},<br /><br />Your ban appeal was approved.<br /><br /><strong>Appeal ID:</strong> {appealId}<br /><br /><strong>Decision notes:</strong><br />{decisionNotes}`,
        ),
        defaultHtml: buildHtmlShell(
            "Ban appeal approved",
            `<p>Hey {displayName},</p><p>Your ban appeal was approved.</p><p><strong>Appeal ID:</strong> {appealId}</p><p><strong>Decision notes:</strong><br />{decisionNotes}</p>`,
        ),
    },
    {
        key: "BAN_APPEAL_DENIED",
        category: "BAN_APPEAL_DENIED",
        name: "Ban Appeal Denied",
        description: "Decision email when a ban appeal is denied.",
        defaultEditorType: "MJML",
        defaultSubject: "Your SparkzLive ban appeal was denied",
        variables: [
            ...identityVariables,
            {
                name: "appealId",
                description: "Appeal identifier.",
                required: true,
                example: "BA-1029",
            },
            {
                name: "decisionNotes",
                description: "Admin decision notes shown to the user.",
                required: false,
                example: "The original enforcement remains in place.",
            },
            {
                name: "reviewedAt",
                description: "Timestamp when the appeal was reviewed.",
                required: false,
                example: "2026-04-14T15:00:00.000Z",
            },
            {
                name: "status",
                description: "Current appeal status.",
                required: false,
                example: "DENIED",
            },
            {
                name: "banReason",
                description: "Snapshot of the original ban reason.",
                required: false,
                example: "Harassment",
            },
            {
                name: "contactNote",
                description: "Optional contact note from the user.",
                required: false,
                example: "Please contact me if more info is needed.",
            },
            {
                name: "appealMessage",
                description: "Appeal message submitted by the user.",
                required: false,
                example: "I believe this enforcement was made in error.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Ban appeal denied",
            `Hey {displayName},<br /><br />Your ban appeal was denied.<br /><br /><strong>Appeal ID:</strong> {appealId}<br /><br /><strong>Decision notes:</strong><br />{decisionNotes}`,
        ),
        defaultHtml: buildHtmlShell(
            "Ban appeal denied",
            `<p>Hey {displayName},</p><p>Your ban appeal was denied.</p><p><strong>Appeal ID:</strong> {appealId}</p><p><strong>Decision notes:</strong><br />{decisionNotes}</p>`,
        ),
    },
    {
        key: "PURCHASE_CONFIRMATION",
        category: "PURCHASE_CONFIRMATION",
        name: "Purchase Confirmation",
        description: "Receipt-style purchase confirmation email.",
        defaultEditorType: "MJML",
        defaultSubject: "Your SparkzLive purchase is confirmed",
        variables: [
            ...identityVariables,
            {
                name: "packageName",
                description: "The purchased package name.",
                required: true,
                example: "10,000 Coins Bundle",
            },
            {
                name: "amount",
                description: "Purchase amount string.",
                required: true,
                example: "$9.99",
            },
            {
                name: "orderId",
                description: "Purchase order id.",
                required: false,
                example: "f9a5f8df-1111-2222-3333-444444444444",
            },
            {
                name: "packageLabel",
                description: "Display label for the purchased package.",
                required: false,
                example: "10,000 Coins Bundle",
            },
            {
                name: "coinAmount",
                description: "Number of coins purchased.",
                required: false,
                example: "10000",
            },
            {
                name: "priceCents",
                description: "Price in cents.",
                required: false,
                example: "999",
            },
            {
                name: "currency",
                description: "Purchase currency code.",
                required: false,
                example: "USD",
            },
            {
                name: "provider",
                description: "Purchase provider.",
                required: false,
                example: "STRIPE",
            },
            {
                name: "providerRef",
                description: "Provider reference id.",
                required: false,
                example: "pi_123456789",
            },
            {
                name: "paidAt",
                description: "Timestamp when the order was paid.",
                required: false,
                example: "2026-04-14T10:00:00.000Z",
            },
            {
                name: "fulfilledAt",
                description: "Timestamp when the order was fulfilled.",
                required: false,
                example: "2026-04-14T10:01:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Purchase confirmed",
            `Hey {displayName},<br /><br />Your purchase was successful.<br /><br /><strong>Package:</strong> {packageName}<br /><strong>Amount:</strong> {amount}`,
        ),
        defaultHtml: buildHtmlShell(
            "Purchase confirmed",
            `<p>Hey {displayName},</p><p>Your purchase was successful.</p><p><strong>Package:</strong> {packageName}<br /><strong>Amount:</strong> {amount}</p>`,
        ),
    },
    {
        key: "PAYOUT_REQUEST_RECEIVED",
        category: "PAYOUT_REQUEST_RECEIVED",
        name: "Payout Request Received",
        description: "Acknowledgement that a payout request was received.",
        defaultEditorType: "MJML",
        defaultSubject: "We received your payout request",
        variables: [
            ...identityVariables,
            {
                name: "amount",
                description: "Payout amount.",
                required: true,
                example: "$120.00",
            },
            {
                name: "payoutRequestId",
                description: "Payout request id.",
                required: false,
                example: "e8cb4d64-1111-2222-3333-444444444444",
            },
            {
                name: "diamondAmount",
                description: "Diamond amount requested.",
                required: false,
                example: "12000",
            },
            {
                name: "netAmount",
                description: "Net payout amount in cents or formatted output if your template formats it.",
                required: false,
                example: "12000",
            },
            {
                name: "status",
                description: "Current payout request status.",
                required: false,
                example: "PENDING",
            },
            {
                name: "createdAt",
                description: "Timestamp when the payout request was created.",
                required: false,
                example: "2026-04-14T10:00:00.000Z",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Payout request received",
            `Hey {displayName},<br /><br />We received your payout request for <strong>{amount}</strong>.`,
        ),
        defaultHtml: buildHtmlShell(
            "Payout request received",
            `<p>Hey {displayName},</p><p>We received your payout request for <strong>{amount}</strong>.</p>`,
        ),
    },
    {
        key: "PAYOUT_APPROVED",
        category: "PAYOUT_APPROVED",
        name: "Payout Approved",
        description: "Payout approved notification.",
        defaultEditorType: "MJML",
        defaultSubject: "Your payout was approved",
        variables: [
            ...identityVariables,
            {
                name: "amount",
                description: "Payout amount.",
                required: true,
                example: "$120.00",
            },
            {
                name: "decisionNotes",
                description: "Optional approval notes.",
                required: false,
                example: "Your request has moved to the payout queue.",
            },
            {
                name: "payoutRequestId",
                description: "Payout request id.",
                required: false,
                example: "e8cb4d64-1111-2222-3333-444444444444",
            },
            {
                name: "diamondAmount",
                description: "Diamond amount requested.",
                required: false,
                example: "12000",
            },
            {
                name: "netAmount",
                description: "Net payout amount.",
                required: false,
                example: "12000",
            },
            {
                name: "status",
                description: "Current payout request status.",
                required: false,
                example: "PROCESSING",
            },
            {
                name: "paymentMethod",
                description: "Selected payout payment method.",
                required: false,
                example: "PAYPAL",
            },
            {
                name: "paymentReference",
                description: "Payout payment reference.",
                required: false,
                example: "payout_ref_123",
            },
            {
                name: "processedAt",
                description: "Timestamp when the payout entered processing or completion flow.",
                required: false,
                example: "2026-04-14T12:00:00.000Z",
            },
            {
                name: "adminNotes",
                description: "Internal/admin-facing note exposed in the template when desired.",
                required: false,
                example: "Your request has moved to the payout queue.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Payout approved",
            `Hey {displayName},<br /><br />Your payout for <strong>{amount}</strong> was approved.<br /><br />{decisionNotes}`,
        ),
        defaultHtml: buildHtmlShell(
            "Payout approved",
            `<p>Hey {displayName},</p><p>Your payout for <strong>{amount}</strong> was approved.</p><p>{decisionNotes}</p>`,
        ),
    },
    {
        key: "PAYOUT_DENIED",
        category: "PAYOUT_DENIED",
        name: "Payout Denied",
        description: "Payout denied notification.",
        defaultEditorType: "MJML",
        defaultSubject: "Your payout request was denied",
        variables: [
            ...identityVariables,
            {
                name: "amount",
                description: "Payout amount.",
                required: true,
                example: "$120.00",
            },
            {
                name: "decisionNotes",
                description: "Optional denial notes.",
                required: false,
                example: "Please update your payout method and resubmit.",
            },
            {
                name: "payoutRequestId",
                description: "Payout request id.",
                required: false,
                example: "e8cb4d64-1111-2222-3333-444444444444",
            },
            {
                name: "diamondAmount",
                description: "Diamond amount requested.",
                required: false,
                example: "12000",
            },
            {
                name: "netAmount",
                description: "Net payout amount.",
                required: false,
                example: "12000",
            },
            {
                name: "status",
                description: "Current payout request status.",
                required: false,
                example: "REJECTED",
            },
            {
                name: "paymentMethod",
                description: "Selected payout payment method.",
                required: false,
                example: "PAYPAL",
            },
            {
                name: "paymentReference",
                description: "Payout payment reference.",
                required: false,
                example: "payout_ref_123",
            },
            {
                name: "processedAt",
                description: "Timestamp when the request was denied.",
                required: false,
                example: "2026-04-14T12:00:00.000Z",
            },
            {
                name: "adminNotes",
                description: "Admin notes associated with the denial.",
                required: false,
                example: "Please update your payout method and resubmit.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Payout denied",
            `Hey {displayName},<br /><br />Your payout request for <strong>{amount}</strong> was denied.<br /><br />{decisionNotes}`,
        ),
        defaultHtml: buildHtmlShell(
            "Payout denied",
            `<p>Hey {displayName},</p><p>Your payout request for <strong>{amount}</strong> was denied.</p><p>{decisionNotes}</p>`,
        ),
    },
    {
        key: "PAYOUT_PROCESSED",
        category: "PAYOUT_PROCESSED",
        name: "Payout Processed",
        description: "Payout processed notification.",
        defaultEditorType: "MJML",
        defaultSubject: "Your payout was processed",
        variables: [
            ...identityVariables,
            {
                name: "amount",
                description: "Payout amount.",
                required: true,
                example: "$120.00",
            },
            {
                name: "payoutRequestId",
                description: "Payout request id.",
                required: false,
                example: "e8cb4d64-1111-2222-3333-444444444444",
            },
            {
                name: "diamondAmount",
                description: "Diamond amount requested.",
                required: false,
                example: "12000",
            },
            {
                name: "netAmount",
                description: "Net payout amount.",
                required: false,
                example: "12000",
            },
            {
                name: "status",
                description: "Current payout request status.",
                required: false,
                example: "PAID",
            },
            {
                name: "paymentMethod",
                description: "Selected payout payment method.",
                required: false,
                example: "PAYPAL",
            },
            {
                name: "paymentReference",
                description: "Payout payment reference.",
                required: false,
                example: "payout_ref_123",
            },
            {
                name: "processedAt",
                description: "Timestamp when the payout completed processing.",
                required: false,
                example: "2026-04-14T12:00:00.000Z",
            },
            {
                name: "adminNotes",
                description: "Admin notes associated with the payout.",
                required: false,
                example: "Funds were routed successfully.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Payout processed",
            `Hey {displayName},<br /><br />Your payout for <strong>{amount}</strong> was processed.`,
        ),
        defaultHtml: buildHtmlShell(
            "Payout processed",
            `<p>Hey {displayName},</p><p>Your payout for <strong>{amount}</strong> was processed.</p>`,
        ),
    },
    {
        key: "SUPPORT_REPLY",
        category: "SUPPORT_REPLY",
        name: "Support Reply",
        description: "Manual support or ticket response email.",
        defaultEditorType: "MJML",
        defaultSubject: "A SparkzLive support specialist replied",
        variables: [
            ...identityVariables,
            {
                name: "decisionNotes",
                description: "Reply body or support message content.",
                required: true,
                example: "Thanks for contacting support. Here is the next step.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Support reply",
            `Hey {displayName},<br /><br />{decisionNotes}`,
        ),
        defaultHtml: buildHtmlShell(
            "Support reply",
            `<p>Hey {displayName},</p><p>{decisionNotes}</p>`,
        ),
    },
    {
        key: "ADMIN_MANUAL_MESSAGE",
        category: "ADMIN_MANUAL_MESSAGE",
        name: "Admin Manual Message",
        description: "Manual admin-originated email.",
        defaultEditorType: "MJML",
        defaultSubject: "A message from SparkzLive",
        variables: [
            ...identityVariables,
            {
                name: "decisionNotes",
                description: "Main message body content.",
                required: true,
                example: "This is a test admin message.",
            },
        ],
        defaultMjml: buildMjmlShell(
            "Message from SparkzLive",
            `Hey {displayName},<br /><br />{decisionNotes}`,
        ),
        defaultHtml: buildHtmlShell(
            "Message from SparkzLive",
            `<p>Hey {displayName},</p><p>{decisionNotes}</p>`,
        ),
    },
    {
        key: "MARKETING_CAMPAIGN",
        category: "MARKETING_CAMPAIGN",
        name: "Marketing Campaign",
        description: "General marketing or announcement email.",
        defaultEditorType: "MJML",
        defaultSubject: "What’s new on SparkzLive",
        variables: [
            ...identityVariables,
            {
                name: "campaignTitle",
                description: "Campaign title.",
                required: true,
                example: "Spring Creator Rewards",
            },
            {
                name: "campaignBody",
                description: "Main campaign copy.",
                required: true,
                example: "Check out the latest promotion inside the app.",
            },
            {
                name: "ctaUrl",
                description: "Primary call-to-action URL.",
                required: false,
                example: "https://sparkzlive.com/app",
            },
        ],
        defaultMjml: buildMjmlShell(
            "What’s new on SparkzLive",
            `<strong>{campaignTitle}</strong><br /><br />{campaignBody}<br /><br /><a href="{ctaUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Open SparkzLive</a>`,
        ),
        defaultHtml: buildHtmlShell(
            "What’s new on SparkzLive",
            `<p><strong>{campaignTitle}</strong></p><p>{campaignBody}</p><p><a href="{ctaUrl}" style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#111111;font-weight:700;text-decoration:none;border-radius:10px;">Open SparkzLive</a></p>`,
        ),
    },
];

export function getEmailTemplateCatalogEntry(
    categoryOrKey: EmailCategory | string,
) {
    return (
        EMAIL_TEMPLATE_CATALOG.find(
            (item) =>
                item.key === categoryOrKey ||
                item.category === categoryOrKey,
        ) ?? null
    );
}

export function buildDefaultSampleVariables(entry: EmailTemplateCatalogEntry) {
    const values: Record<string, string> = {};

    for (const variable of entry.variables) {
        values[variable.name] = variable.example ?? "";
    }

    return values;
}

export function buildDefaultTemplateSource(
    entry: EmailTemplateCatalogEntry,
    editorType: EmailTemplateEditorTypeValue,
) {
    return editorType === "HTML" ? entry.defaultHtml : entry.defaultMjml;
}