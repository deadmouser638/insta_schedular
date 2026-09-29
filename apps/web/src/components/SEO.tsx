import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  canonicalUrl?: string
  jsonLd?: Record<string, any>
}

export default function SEO({
  title = 'IG Scheduler Pro - Instagram Scheduling & Social Media API',
  description = 'Schedule Instagram posts, reels, carousels, and stories automatically with IG Scheduler Pro.',
  keywords = 'instagram scheduler, ig api, social media manager, content calendar',
  ogImage = 'https://insta-schedular-api.vercel.app/og-image.png',
  canonicalUrl = 'https://insta-schedular-api.vercel.app/',
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    document.title = title

    // Helper to update meta tag by name or property
    const setMeta = (attrName: 'name' | 'property', attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attrName, attrVal)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // 2. Standard Meta Tags
    setMeta('name', 'description', description)
    setMeta('name', 'keywords', keywords)

    // 3. OpenGraph Meta Tags
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:url', canonicalUrl)

    // 4. Twitter Card Tags
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', ogImage)

    // 5. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)

    // 6. JSON-LD Dynamic Injection
    if (jsonLd) {
      const scriptId = 'page-json-ld'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.text = JSON.stringify(jsonLd)
    }
  }, [title, description, keywords, ogImage, canonicalUrl, jsonLd])

  return null
}
