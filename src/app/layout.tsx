import { Providers } from "./providers";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full">
            <body className="h-full grain">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
