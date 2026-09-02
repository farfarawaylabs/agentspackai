# Static HTML prototype contract

Use for standalone design prototypes and Studio concepts. The deliverable
must be viewable without the real application, a backend, package installation,
or a build step. Static does not mean noninteractive: local JavaScript can
demonstrate menus, tabs, dialogs, form feedback, and other relevant states.

## Scope and structure

Use the supplied prototype directory, or choose a new directory under the
project's artifact conventions outside app source, build, and public trees.
Keep one concept per directory. Never overwrite an existing concept unless
the user asked to refine it.

Each concept contains `index.html`, optional local `assets/`, and draft design
notes when useful. If using `DESIGN.md`, it belongs in that concept directory;
its tokens describe that prototype, not a new application-wide design system.
Read the application's design guidance for constraints without editing it.
Do not change app routes, styles, components, dependency manifests, lockfiles,
or deployment configuration to make a prototype work.

## Build a portable page

- Prefer one HTML file with embedded CSS and classic JavaScript. Bundle fonts,
  images, media, and any necessary libraries locally when embedding them is
  impractical. Use relative paths contained within the concept directory.
- Do not rely on remote font services, CDNs, hotlinked images, localhost URLs,
  application endpoints, server-side rendering, or a development server.
  Ordinary outbound links may exist, but must not be required to view the
  design. Disclose any user-requested online dependency.
- Avoid runtime module imports or fetching local JSON/templates. Inline
  demonstration data and use code that works when the HTML is opened directly
  as a file. Build tools may generate the artifact only when useful and
  confined to prototype work; the recipient must not need them.
- Include the viewport meta tag, semantic markup, responsive layouts, useful
  keyboard interactions, and reduced-motion behavior where applicable.
  Demonstrate the requested page coverage, not merely a hero screenshot.
- Give controls an honest local behavior: opening a demo dialog, changing a
  tab, or showing simulated form validation. Prevent form submissions and
  purchases from reaching real services. Explain demo-only actions where a
  user would otherwise mistake them for completed operations.
- Use realistic content consistent across competing concepts. Do not package
  production records or secrets; use public, user-approved, or clearly
  illustrative data without inventing social proof or product claims.

Generated imagery and motion may enrich the design when tools and budget
allow. Save the resulting media in the concept's deliverable and keep its
fallback usable. Do not replace a distinctive design with a generic template
merely because it must be static.

## Verify what the recipient receives

Open the actual HTML using a file URL when browser tools support it. Inspect
desktop and narrow widths, exercise the demonstrated interactions, and check
console errors, missing assets, overflow, and focus behavior. Verify it works
without network access; a page that only works through the app server has not
passed static verification. A local preview server can help development but
does not replace direct-file verification. Report browser-tool limitations.

For a multi-file package, copy it to a fresh location or extract its ZIP there,
then open it again. Check every gallery link and required asset resolves
within the package. Copying or extracting must not overwrite existing work.
Inspect the package contents; include only the intended pages, required assets,
and sharing notes. Keep internal run records and critic history outside it.

Use any checks that target these artifacts. Do not install or build the real
application just to verify static prototypes. Confirm the existing app files
and root design contract were not changed, preserving any pre-existing edits.

Report files and paths, inspected views/states, whether direct-file and offline
opening were verified, demo-only behavior, and remaining gaps. Screenshots
support comparison but do not replace the actual shareable HTML deliverable.
