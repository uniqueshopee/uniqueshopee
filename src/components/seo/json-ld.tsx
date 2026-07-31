import { serializeJsonLd } from "@/lib/seo";

type JsonLdScriptProps = {
  data: unknown;
};

function JsonLdScript({ data }: JsonLdScriptProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

export { JsonLdScript };
