import { QueryCtx, MutationCtx } from "./_generated/server";
import { MASTER_ADMINS } from "./permissions";

/**
 * Server-side guard to verify if the current user has admin powers.
 * Throws an 'Unauthorized' error if the check fails.
 */
export async function checkAdminPower(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
        throw new Error('Unauthenticated');
    }

    // Strictly verify the email is in the MASTER_ADMINS list
    const email = identity.email;

    if (!email || !MASTER_ADMINS.includes(email)) {
        console.warn(`Unauthorized admin access attempt by: ${email}`);
        throw new Error('Unauthorized: Master Admin access required');
    }

    // Optional: Also check for user record in DB if needed, 
    // but requirements specify strict email check.
    return identity;
}
