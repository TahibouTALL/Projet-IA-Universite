import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: ["/((?!login|register|api/auth|_next|favicon.ico|robots.txt).+)"],
};
