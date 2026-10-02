type JsonLdData =
  | Record<string, unknown>
  | Record<string, unknown>[];

type JsonLdProps = {
  data: JsonLdData;
};

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data);

  const safeJson = json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJson,
      }}
    />
  );
}