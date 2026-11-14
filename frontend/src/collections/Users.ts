import type { Access, CollectionConfig } from 'payload'

const isAccountOwner: Access = ({ req }) => {
  if (req.user?.collection !== 'users') return false

  return {
    id: {
      equals: req.user.id,
    },
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    hidden: true,
    useAsTitle: 'name',
  },
  access: {
    create: () => true,
    delete: isAccountOwner,
    read: isAccountOwner,
    update: isAccountOwner,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'accessNeeds',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Blind or low vision', value: 'vision' },
        { label: 'Deaf or hard of hearing', value: 'hearing' },
        { label: 'Motor or mobility disability', value: 'motor' },
        { label: 'Cognitive or learning disability', value: 'cognitive' },
        { label: 'Sensory sensitivity', value: 'sensory' },
        { label: 'Speech disability', value: 'speech' },
      ],
    },
    {
      name: 'assistantPreferences',
      type: 'group',
      fields: [
        {
          name: 'interactionMode',
          type: 'select',
          defaultValue: 'voice-and-touch',
          options: [
            { label: 'Voice first', value: 'voice-first' },
            { label: 'Voice and touch', value: 'voice-and-touch' },
            { label: 'Touch and keyboard first', value: 'touch-first' },
          ],
        },
        {
          name: 'responseDetail',
          type: 'select',
          defaultValue: 'balanced',
          options: [
            { label: 'Short and simple', value: 'brief' },
            { label: 'Balanced', value: 'balanced' },
            { label: 'Detailed descriptions', value: 'detailed' },
          ],
        },
        {
          name: 'confirmationStyle',
          type: 'select',
          defaultValue: 'spoken-and-visual',
          options: [
            { label: 'Spoken confirmation', value: 'spoken' },
            { label: 'Visual confirmation', value: 'visual' },
            { label: 'Spoken and visual', value: 'spoken-and-visual' },
            { label: 'Vibration and visual', value: 'vibration-and-visual' },
          ],
        },
        {
          name: 'extraResponseTime',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
  versions: false,
}
