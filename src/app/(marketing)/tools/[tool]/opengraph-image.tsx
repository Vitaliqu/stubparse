import { ogImage, OG_SIZE } from "@/lib/seo/og";
import { findTool, TOOLS } from "@/lib/seo/calculators";

export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => TOOLS.map((t) => ({ tool: t.slug }));

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  return ogImage("Free calculator", findTool((await params).tool)?.title.replace(/:.*$/, "") ?? "Free calculators");
}
