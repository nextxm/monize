import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const throttlingDisabled =
      process.env.DISABLE_API_THROTTLING?.toLowerCase() === "true";

    if (throttlingDisabled) {
      return true;
    }

    return super.canActivate(context);
  }
}