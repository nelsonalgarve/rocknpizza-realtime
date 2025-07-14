// app/layout.tsx
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'RocknPizza',
  description: 'Suivi des commandes en temps réel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  )
}
