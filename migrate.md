Before returning to the broader roadmap, the next immediate steps to complete your i18n migration and ensure a smooth multilingual experience are:

Refactor All UI Components for i18n:

Update components like Hero, Footer, Header, and any others to accept translation props (from the dictionary) instead of hardcoded text.
Update Navigation and Links:

Ensure all internal links include the locale in their paths (e.g., /bg/products, /en/products).
Add a language switcher component to allow users to change languages.
Test All Localized Routes:

Verify that all pages render correctly in both bg and en, and that translations load as expected.
Clean Up Old /pages Directory:

Remove or archive the old /pages directory to avoid confusion and ensure you’re fully using the App Router.
Update Documentation:

Add notes to your README about the new i18n structure and how to add new languages or translations.
Once these are done, you can return to the main roadmap for backend integration, advanced features, or deployment. Would you like to proceed with refactoring a specific component for i18n or set up the language switcher next?