# Regras de Desenvolvimento para Dyad AI

Este documento descreve a pilha de tecnologia e as diretrizes para o uso de bibliotecas no projeto "Clínica Estética Belleza Pura".

## Pilha de Tecnologia

*   **Frontend Framework**: React.js para a construção de interfaces de usuário dinâmicas e reativas.
*   **Linguagem**: TypeScript para garantir a segurança de tipos, melhorar a manutenibilidade e a detecção precoce de erros.
*   **Estilização**: Tailwind CSS para um desenvolvimento de UI rápido e responsivo, utilizando classes utilitárias.
*   **Roteamento**: O roteamento é gerenciado internamente no `src/App.tsx` usando o estado `currentPage` do React, sem a necessidade de uma biblioteca de roteamento externa como React Router.
*   **Backend/Banco de Dados**: Supabase é a plataforma de backend pretendida para autenticação e gerenciamento de dados, embora as operações de API atualmente utilizem dados mockados em `src/services/api.ts`.
*   **Gráficos e Visualização de Dados**: Recharts é utilizado para criar gráficos e visualizações de dados nos relatórios administrativos.
*   **Ícones**: A biblioteca `lucide-react` está disponível para a inclusão de ícones escaláveis e personalizáveis.
*   **Componentes UI**: Componentes pré-construídos do `shadcn/ui` e primitivos do Radix UI estão disponíveis para garantir consistência e acessibilidade no design.

## Regras de Uso de Bibliotecas e Diretrizes de Código

*   **Estrutura de Componentes**: Todos os componentes e páginas devem ser escritos em React com TypeScript.
*   **Estilização**: Utilize exclusivamente classes do Tailwind CSS para estilizar componentes. Evite estilos inline ou arquivos CSS separados, exceto para estilos globais essenciais (como `index.css`).
*   **Roteamento**: Mantenha a lógica de roteamento existente em `src/App.tsx` baseada no estado `currentPage`. Não introduza bibliotecas de roteamento adicionais.
*   **Interações com API**: Todas as chamadas de API para buscar ou modificar dados devem ser feitas através dos serviços definidos em `src/services/api.ts`.
*   **Gráficos**: Para qualquer necessidade de visualização de dados, utilize a biblioteca Recharts.
*   **Ícones**: Sempre que precisar de ícones, importe-os do pacote `lucide-react`.
*   **Componentes UI**: Priorize o uso de componentes do `shadcn/ui`. Se um componente específico não estiver disponível ou precisar de personalização significativa, crie um novo componente customizado utilizando Tailwind CSS e, se necessário, primitivos do Radix UI. **Não modifique os arquivos dos componentes `shadcn/ui` diretamente.**
*   **Organização de Arquivos**: Mantenha a estrutura de diretórios atual: `src/pages/` para páginas, `src/components/` para componentes reutilizáveis, `src/services/` para lógica de API e `src/supabase/` para o cliente Supabase.
*   **Novos Componentes/Hooks**: Crie um novo arquivo para cada novo componente ou hook, mantendo-os pequenos e com responsabilidades únicas (idealmente com menos de 100 linhas de código).