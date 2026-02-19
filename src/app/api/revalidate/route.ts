import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

interface SanityWebhookBody {
  _type: string;
  _id: string;
  slug?: { current: string };
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-sanity-webhook-secret");

    if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { message: "Invalid secret" },
        { status: 401 }
      );
    }

    const body: SanityWebhookBody = await request.json();
    const { _type, slug } = body;

    const revalidatedPaths: string[] = [];

    switch (_type) {
      case "post":
        revalidatePath("/blog");
        revalidatePath("/en/blog");
        revalidatedPaths.push("/blog", "/en/blog");
        if (slug?.current) {
          revalidatePath(`/blog/${slug.current}`);
          revalidatePath(`/en/blog/${slug.current}`);
          revalidatedPaths.push(`/blog/${slug.current}`, `/en/blog/${slug.current}`);
        }
        // Also revalidate home page (blog preview section)
        revalidatePath("/");
        revalidatePath("/en");
        revalidatedPaths.push("/", "/en");
        break;

      case "testimonial":
        // Testimonials appear on home page
        revalidatePath("/");
        revalidatePath("/en");
        revalidatedPaths.push("/", "/en");
        break;

      case "teamMember":
        // Team members appear on about page
        revalidatePath("/nosotros");
        revalidatePath("/en/about");
        revalidatedPaths.push("/nosotros", "/en/about");
        break;

      case "client":
        // Clients appear on home page
        revalidatePath("/");
        revalidatePath("/en");
        revalidatedPaths.push("/", "/en");
        break;

      case "service":
        revalidatePath("/servicios");
        revalidatePath("/en/services");
        revalidatedPaths.push("/servicios", "/en/services");
        if (slug?.current) {
          revalidatePath(`/servicios/${slug.current}`);
          revalidatePath(`/en/services/${slug.current}`);
          revalidatedPaths.push(`/servicios/${slug.current}`, `/en/services/${slug.current}`);
        }
        // Also revalidate home page (services section)
        revalidatePath("/");
        revalidatePath("/en");
        revalidatedPaths.push("/", "/en");
        break;

      case "faq":
        revalidatePath("/faq");
        revalidatePath("/en/faq");
        revalidatedPaths.push("/faq", "/en/faq");
        // FAQs also appear on service detail pages
        revalidatePath("/servicios", "layout");
        revalidatePath("/en/services", "layout");
        break;

      case "heroSlide":
        // Hero slides appear on home page
        revalidatePath("/");
        revalidatePath("/en");
        revalidatedPaths.push("/", "/en");
        break;

      case "siteSettings":
        // Site settings affect all pages (footer, etc.)
        revalidatePath("/", "layout");
        revalidatedPaths.push("/ (layout)");
        break;

      case "author":
      case "category":
        // These are related to blog posts
        revalidatePath("/blog");
        revalidatePath("/en/blog");
        revalidatedPaths.push("/blog", "/en/blog");
        break;

      default:
        // Unknown type - revalidate home page as fallback
        revalidatePath("/");
        revalidatePath("/en");
        revalidatedPaths.push("/", "/en");
    }

    return NextResponse.json({
      revalidated: true,
      type: _type,
      paths: revalidatedPaths,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { message: "Error revalidating", error: String(error) },
      { status: 500 }
    );
  }
}

// Handle GET for testing the endpoint
export async function GET() {
  return NextResponse.json({
    message: "Sanity revalidation webhook endpoint",
    usage: "Send POST request with x-sanity-webhook-secret header",
  });
}
