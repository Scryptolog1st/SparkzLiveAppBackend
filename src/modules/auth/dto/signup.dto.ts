import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class SignupDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail({}, { message: "Enter a valid email address." })
  @IsNotEmpty({ message: "Email is required." })
  email!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Username must be text." })
  @IsNotEmpty({ message: "Username is required." })
  @MinLength(3, { message: "Username must be at least 3 characters." })
  @MaxLength(24, { message: "Username must be 24 characters or fewer." })
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_]{2,23}$/, {
    message:
      "Username can only use letters, numbers, and underscores, and must start with a letter or number.",
  })
  username!: string;

  @IsString({ message: "Password must be text." })
  @MinLength(8, { message: "Password must be at least 8 characters." })
  password!: string;
}