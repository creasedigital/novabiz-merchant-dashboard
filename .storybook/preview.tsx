import type { Preview } from '@storybook/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '../src/ui/toaster'
import '../src/index.css'

const storybookQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
})

const preview: Preview = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={storybookQueryClient}>
        <div className="p-4 antialiased text-gray-900 dark:text-gray-100">
          <Story />
          <Toaster />
        </div>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#030712' },
      ],
    },
  },
}

export default preview
