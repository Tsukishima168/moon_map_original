
import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'menuItem',
    title: 'Menu Item (甜點/飲品)',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name (名稱)',
            type: 'string',
        }),
        defineField({
            name: 'image',
            title: 'Image (圖片)',
            type: 'image',
            options: {
                hotspot: true,
            },
        }),
        defineField({
            name: 'category',
            title: 'Category (所屬類別)',
            type: 'reference',
            to: { type: 'category' },
        }),
        defineField({
            name: 'prices',
            title: 'Prices (價格規格)',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'spec', type: 'string', title: 'Spec (規格 e.g. 200ml)' },
                        { name: 'price', type: 'string', title: 'Price (價格 e.g. $160)' },
                    ],
                },
            ],
        }),
        defineField({
            name: 'isAvailable',
            title: 'Is Available (是否上架)',
            type: 'boolean',
            initialValue: true,
        }),
    ],
})
