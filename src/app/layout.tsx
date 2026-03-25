import {CssBaseline, Link} from "@mui/material"
import Navbar from "./_components/Navbar"
import Providers from "./providers"
import StoreProvider from "@/app/StoreProvider";
import DataSourceProvider from "@/app/contexts/DataSourceContext";


export default function RootLayout({children,}: {
    children: React.ReactNode
}) {

    return (
        <html lang="en">
        <head>
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#000000" />
            <link rel="apple-touch-icon" href="/opensensorhub.png" />
        </head>
        <body>
        <script
            dangerouslySetInnerHTML={{
                __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    }, function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    });
                  });
                }
              `,
            }}
        />
        <Providers>
            <StoreProvider>
                <CssBaseline/>
                <DataSourceProvider>
                    <Navbar>
                        {children}
                    </Navbar>
                </DataSourceProvider>
            </StoreProvider>
        </Providers>
        </body>
    </html>
 )
}
