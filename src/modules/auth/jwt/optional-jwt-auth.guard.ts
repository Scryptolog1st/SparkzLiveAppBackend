import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
    // Added ': any' to the parameters to satisfy strict mode
    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            return null;
        }
        return user;
    }
}