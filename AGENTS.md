- Only create an abstraction if it's actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression would suffice
- Use 'knip' to remove unused code if making large changes
- The 'gh' CLI is installed, use it
- Don't use emojis

## React

- React Compiler is enabled, skip manual 'useMemo / 'useCallback"
- Avoid massive JSX blocks and compose smaller components
- Colocate code that changes

## Tailwind values, rarely globals

- Always use v4 + global CSS file format + shadcn/ui | 2L to chat, 36K to generate ## Next
- Content pages use MDX
- Prefer fetching data in RSC (page can still be static)
- Use next/font + next/script when applicable
- For above-the-fold images, use 'priority" on next/image
- Be mindful of serialized prop size for RSC → child components

## TypeScript

- Don't unnecessarily add 'try / catch"
- Don't cast to
