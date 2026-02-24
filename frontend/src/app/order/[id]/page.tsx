// Server component - exports generateStaticParams for static export compatibility
import OrderPageClient from './OrderPageClient';

// Required for `output: 'export'` in next.config.js
// We provide a dummy ID to satisfy the build system; actual IDs are resolved client-side.
export function generateStaticParams() {
    return [{ id: 'status' }];
}

// Ensure Next.js doesn't try to generate other params at build time
export const dynamicParams = false;

export default function OrderPage() {
    return <OrderPageClient />;
}
