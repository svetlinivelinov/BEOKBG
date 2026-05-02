/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n is handled manually via app/[locale]/ segments (App Router).
  // next.config.js i18n is not compatible with App Router and causes
  // conflicts where [locale] receives unexpected values.
};

module.exports = nextConfig;
