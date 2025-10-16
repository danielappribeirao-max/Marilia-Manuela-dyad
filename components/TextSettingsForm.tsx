import React, { useState, useEffect } from 'react';

interface TextSettingsFormProps {
  initialHeroText: string;
  initialHeroSubtitle: string; // NOVO
  initialAboutText: string;
  onSave: (texts: { heroText: string; heroSubtitle: string; aboutText: string }) => Promise<void>; // NOVO
}

const TextSettingsForm: React.FC<TextSettingsFormProps> = ({ initialHeroText, initialHeroSubtitle, initialAboutText, onSave }) => {
  const [formData, setFormData] = useState({
    heroText: initialHeroText,
    heroSubtitle: initialHeroSubtitle, // NOVO
    aboutText: initialAboutText,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({ heroText: initialHeroText, heroSubtitle: initialHeroSubtitle, aboutText: initialAboutText });
  }, [initialHeroText, initialHeroSubtitle, initialAboutText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Chamando onSave com o objeto formData completo
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Personalize os textos principais exibidos na página inicial para refletir a mensagem da sua clínica.</p>
      </div>

      {/* Hero Text (Title) */}
      <div>
        <label htmlFor="heroText" className="block text-sm font-medium text-gray-700 mb-1">Texto Principal da Home (Título)</label>
        <textarea
          id="heroText"
          name="heroText"
          value={formData.heroText}
          onChange={handleChange}
          rows={2}
          maxLength={100}
          className="w-full p-3 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
          placeholder="Ex: Sua Beleza, Nosso Compromisso."
        />
        <p className="text-xs text-gray-500 mt-1">Máximo de 100 caracteres.</p>
      </div>
      
      {/* Hero Subtitle (NEW) */}
      <div>
        <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700 mb-1">Subtítulo da Home (Abaixo do Título)</label>
        <textarea
          id="heroSubtitle"
          name="heroSubtitle"
          value={formData.heroSubtitle}
          onChange={handleChange}
          rows={3}
          className="w-full p-3 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
          placeholder="Ex: Descubra tratamentos estéticos de ponta e agende seu momento de cuidado em um ambiente de luxo e bem-estar."
        />
      </div>

      {/* About Text */}
      <div>
        <label htmlFor="aboutText" className="block text-sm font-medium text-gray-700 mb-1">Texto da Seção "Sobre" (Primeiro Parágrafo)</label>
        <textarea
          id="aboutText"
          name="aboutText"
          value={formData.aboutText}
          onChange={handleChange}
          rows={4}
          className="w-full p-3 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
          placeholder="Ex: Na Marília Manuela, acreditamos que a estética vai além da aparência..."
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 shadow disabled:bg-gray-400">
          {isSaving ? 'Salvando...' : 'Salvar Textos'}
        </button>
      </div>
    </form>
  );
};

export default TextSettingsForm;