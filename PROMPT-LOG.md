# Prompt Log

## 1. Scaffold and plan

```text
Lets create scaffolding and plan for assignment 2. The assignment should flow as follows,
For assignment 2 Build a Next.js portfolio website with at least four pages, dynamic routing, and a contact form.
Requirements are as follows:
Build the portfolio with Next.js and include the following pages
Landing page at /
About Me at /about-me
Contact Me Server Form at /contact-me-server-form
Save all contact form submissions in a JSON
My Projects at /projects

Also write agents.md and  test matrix. Ask me any questions
Two dynamically routed projects at /projects/[dynamic routes based on a slug]
Include dynamic routing and a contact form.
```

## 2. Understand the project page insight

```text
app\projects\[slug]\page.js (16:20) @ ProjectPage


  14 |
  15 | export default async function ProjectPage({ params }) {
> 16 |   const { slug } = await params;
     |                    ^
  17 |   const project = projects.find((item) => item.slug === slug);
  18 |
  19 |   if (!project) {

what does this mean in the web page
```

## 3. Trace the insight during navigation

```text
If i go into projects/product--inventory-cli and click on any project link it says 1 insight and shows the same i shared above, what is the issue
```

## 4. Tighten email validation

```text
I just checked that emails of invalid formats are being recorded too fix it and strictly accept actual email format 'name@org.in/com/...
```

## 5. Ask about simultaneous submissions

```text
how are you dealing with simoultanious submissions
```

## 6. Fix the contact form confirmation

```text
Fix the contact form so it shows the thank-you message when a submission is saved. Remove the extra reset since the form already dissapears on success. Test a valid submission, an invalid email, and a failed request to make sure each shows the right mesage.
```

## Reflection

viber has to be given very specific instructions to get the code to work the way it is intended to work. I feel like viber is lacking enough reasoning. I went to check how many reasoning tokens i used and it was lesser than i expected. Maybe playing around with reasoning would make viber more smart and wouldn't need to be mentioned explicitly.
