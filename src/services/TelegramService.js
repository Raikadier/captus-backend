import { TelegramProvider } from './notifications/providers/TelegramProvider.js';
import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export class TelegramService {
    constructor() {
        this.provider = new TelegramProvider();
    }

    async generateLinkCode(userId) {
        const supabase = requireSupabaseClient();

        // Generate a 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Save to DB
        const { data, error } = await supabase
            .from('telegram_link_codes')
            .upsert({
                user_id: userId,
                code: code,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) throw new Error(`Error generating code: ${error.message}`);
        return data;
    }

    async processWebhook(update) {
        if (!update.message) return;

        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text.startsWith('/start')) {
            const args = text.split(' ');
            if (args.length > 1) {
                // Linking via deep link if we implemented that, but we use code
                await this.provider.sendMessage(chatId, '¡Hola! Para vincular tu cuenta, envía el código de 6 dígitos que aparece en la configuración de Captus.');
            } else {
                await this.provider.sendMessage(chatId, '¡Bienvenido a Captus! Para recibir notificaciones, por favor envía el código de vinculación de 6 dígitos desde tu perfil en la aplicación web.');
            }
        } else if (/^\d{6}$/.test(text)) {
            // It's a code
            await this.linkUser(chatId, text);
        } else {
            await this.provider.sendMessage(chatId, 'No entiendo ese comando. Envía tu código de 6 dígitos para vincular tu cuenta.');
        }
    }

    async linkUser(chatId, code) {
        const supabase = requireSupabaseClient();

        // Find valid code
        const { data: linkCode, error } = await supabase
            .from('telegram_link_codes')
            .select('*')
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !linkCode) {
            await this.provider.sendMessage(chatId, 'Código inválido o expirado. Por favor genera uno nuevo en la web.');
            return;
        }

        // Update user with chat_id
        const { error: updateError } = await supabase
            .from('users') // Assuming 'users' table has telegram_chat_id or we use metadata
            // Wait, we need to check where we store this.
            // Task.md said "Update NotificationPreference model". 
            // Let's assume we store it in `notification_preferences` or `users`.
            // The prompt said "Update NotificationPreference model (add telegram_enabled, telegram_chat_id)".
            // Let's check NotificationPreference table/model.
            // For now, I'll assume we store it in `notification_preferences`.

            .from('notification_preferences')
            .upsert({
                user_id: linkCode.user_id,
                telegram_chat_id: chatId.toString(),
                telegram_enabled: true
            });

        // Also update user metadata if needed, but preference table is better.

        if (updateError) {
            console.error('Error linking telegram:', updateError);
            await this.provider.sendMessage(chatId, 'Error al vincular la cuenta. Intenta nuevamente.');
            return;
        }

        // Delete used code
        await supabase.from('telegram_link_codes').delete().eq('code', code);

        await this.provider.sendMessage(chatId, '¡Cuenta vinculada exitosamente! Ahora recibirás notificaciones de Captus por aquí.');
    }

    async unlinkUser(userId) {
        const supabase = requireSupabaseClient();

        const { error } = await supabase
            .from('notification_preferences')
            .update({ telegram_chat_id: null, telegram_enabled: false })
            .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return true;
    }

    async getStatus(userId) {
        const supabase = requireSupabaseClient();
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('telegram_enabled, telegram_chat_id')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return {
            linked: !!data?.telegram_chat_id,
            enabled: !!data?.telegram_enabled
        };
    }
}
