/**
 * Typography for the editor body, built from the existing tokens as Tailwind variants so no new
 * stylesheet is needed. Every class is written out in full because Tailwind finds classes by scanning
 * the source text, so a class assembled from pieces would never be generated.
 */
export const proseClass = [
  // Font, size and line height come from the paper's --doc-* variables, set from the person's view preferences.
  'min-h-[40vh] pb-24 font-[family-name:var(--doc-font)] text-[length:var(--doc-size)] leading-[var(--doc-leading)] text-ink outline-none',
  '[&>*+*]:mt-3',
  '[&_h1]:mt-6 [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:leading-tight',
  '[&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-snug',
  '[&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-md [&_h3]:font-semibold [&_h3]:leading-snug',
  '[&_strong]:font-semibold',
  '[&_a]:cursor-pointer [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-2',
  '[&_u]:underline [&_s]:line-through [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_li>p]:mt-0 [&_li+li]:mt-1',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:text-muted',
  '[&_code]:rounded-[4px] [&_code]:bg-sunken [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em]',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-control [&_pre]:border [&_pre]:bg-sunken [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t',
  '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0',
  '[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2',
  '[&_ul[data-type=taskList]_li>label]:mt-[7px] [&_ul[data-type=taskList]_input]:accent-accent',
  '[&_ul[data-type=taskList]_li>div]:min-w-0 [&_ul[data-type=taskList]_li>div]:flex-1',
  '[&_ul[data-type=taskList]_li[data-checked=true]>div]:text-muted [&_ul[data-type=taskList]_li[data-checked=true]>div]:line-through',
  '[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left',
  '[&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted',
  '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
].join(' ')
