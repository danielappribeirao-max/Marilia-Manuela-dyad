// ... (restante do arquivo omitido por brevidade)

export const bookFreeConsultationForNewUser = async (details: { name: string; phone: string; description: string; date: Date; professionalId: string; serviceId: string; serviceName: string; duration: number }): Promise<{ success: boolean, error: string | null, newUserId?: string, tempEmail?: string }> => {
    try {
        // --- CORREÇÃO DE FUSO HORÁRIO ---
        // Enviamos a data como string ISO, mas a Edge Function precisa saber a hora local.
        // Vamos enviar a data e hora separadamente para que a Edge Function possa reconstruir a data localmente.
        const dateObj = details.date;
        const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        // --------------------------------
        
        const { data, error } = await supabase.functions.invoke('book-free-consultation', {
            body: {
                name: details.name,
                phone: details.phone.replace(/\D/g, ''), // Envia apenas dígitos
                description: details.description,
                date: bookingDate, // Enviando data YYYY-MM-DD
                time: bookingTime, // Enviando hora HH:MM
                professionalId: details.professionalId,
                serviceId: details.serviceId,
                serviceName: details.serviceName,
                duration: details.duration,
            },
        });

        if (error) {
            console.error("Error invoking book-free-consultation function:", error);
            // Se for um erro de rede ou erro 500 do Deno, retornamos uma mensagem genérica
            return { success: false, error: error.message };
        }
        
        // Se a Edge Function retornou um erro no corpo (status 400), data.error estará preenchido
        if (data.error) {
            console.error("Edge Function returned application error:", data.error);
            return { success: false, error: data.error };
        }

        // Se a Edge Function retornou sucesso, mas faltam dados essenciais
        if (!data.success) {
             console.error("Edge Function returned success: false without specific error.");
             return { success: false, error: "Falha desconhecida ao agendar a consulta. Tente novamente." };
        }

        return { success: true, error: null, newUserId: data.newUserId, tempEmail: data.tempEmail };

    } catch (e) {
        console.error("Unexpected error during free consultation booking:", e);
        return { success: false, error: "Erro inesperado ao tentar agendar a consulta gratuita." };
    }
};

export const getSalesData = async (): Promise<Sale[]> => {
// ... (restante do arquivo)