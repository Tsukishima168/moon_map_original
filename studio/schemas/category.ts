
import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'category',
    title: 'Menu Category (類別)',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title (標題)',
            type: 'string',
        }),
        defineField({
            name: 'subtitle',
            title: 'Subtitle (副標題)',
            type: 'string',
        }),
        defineField({
            name: 'slug',
            title: 'Slug (網址 ID)',
            type: 'slug',
            options: {
                source: 'title',
                maxLength: 96,
            },
        }),
        defineField({
            name: 'order',
            title: 'Order (排序)',
            type: 'number',
        }),
        defineField({
            name: 'hidePrice',
            title: 'Hide Price (隱藏價格)',
            type: 'boolean',
            initialValue: false,
        }),
    ],
})
