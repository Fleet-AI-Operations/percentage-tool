'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function clearResetFlagAction() {
    console.log('[clearResetFlagAction] Triggered');
    
    // 1. Get the current user session (to identify who is calling)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const adminSupabase = await createAdminClient();
        
        const result = await prisma.profile.updateMany({
            where: {
                OR: [
                    { id: user.id },
                    { email: user.email }
                ]
            },
            data: { mustResetPassword: false }
        });

        if (result.count === 0) {
            // Fallback: Try raw SQL if Prisma couldn't find the record
            const rawCount = await prisma.$executeRawUnsafe(
                `UPDATE public.profiles SET "mustResetPassword" = false WHERE id = $1::uuid OR email = $2`,
                user.id,
                user.email
            );
            
            if (rawCount === 0) {
                return { 
                    success: false, 
                    error: 'Profile record not found to clear flag',
                    diagnostics: { id: user.id, email: user.email }
                };
            }
        }

        return { success: true, count: result.count };
    } catch (error: any) {
        console.error('[clearResetFlagAction] Fatal error:', error);
        return { success: false, error: error.message };
    }
}
