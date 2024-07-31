import { CssBaseline } from "@mui/material"
import Navbar from "./components/Navbar"
import Providers from "./providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <CssBaseline />
          <Navbar>
            {children}
          </Navbar>
        </Providers>
      </body>
    </html>
  )
}