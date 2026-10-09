type BreadcrumbItem = {
  name: string;
  item: string;
};

type BreadcrumbStructuredDataProps = {
  items: BreadcrumbItem[];
};

export default function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  if (items.length === 0) {
    return null;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}