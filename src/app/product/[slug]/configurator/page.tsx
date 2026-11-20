import { redirect } from "next/navigation";

export default async function ConfiguratorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/product/${slug}`);
}
