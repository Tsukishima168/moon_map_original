
import { createClient } from '@sanity/client'

export const sanityClient = createClient({
    projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
    dataset: import.meta.env.VITE_SANITY_DATASET,
    useCdn: true, // set to `false` to bypass the edge cache
    apiVersion: import.meta.env.VITE_SANITY_API_VERSION || '2024-01-25',
})
