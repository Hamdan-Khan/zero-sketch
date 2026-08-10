# Contributing to ZeroSketch

Thanks for taking the time to contribute to ZeroSketch!

All types of contributions are encouraged and valued. See the [Table of Contents](#-table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution.

> If you like the project but don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation:
> - Star the project
> - Share this project with your friends/colleagues

## Table of Contents

- [I Have a Question](#i-have-a-question)
  - [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Repository Structure](#repository-structure)
  - [Your First Code Contribution](#your-first-code-contribution)


## I Have a Question

Before you ask a question, it is best to search for existing [Issues](https://github.com/Hamdan-khan/zero-sketch/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/Hamdan-khan/zero-sketch/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

## I Want To Contribute

> ### Legal Notice
> When contributing to this project, you must agree that you have authored 100% of the content, that you have the necessary rights to the content and that the content you contribute may be provided under the project's [Apache 2.0](LICENSE) licence.

### Reporting Bugs

#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version of ZeroSketch (hard refresh on browser to access it).
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions.
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](https://github.com/Hamdan-khan/zero-sketch/issues?q=label%3Abug).
- Collect information about the bug:
  - Stack trace (Traceback)
  - OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
  - Version of the interpreter, compiler, SDK, runtime environment, package manager, depending on what seems relevant.
  - Possibly your input and the output
  - Can you reliably reproduce the issue? And can you also reproduce it with older versions?

#### How Do I Submit a Good Bug Report?

> You must never report security related issues, vulnerabilities or bugs including sensitive information to the issue tracker, or elsewhere in public. Instead sensitive bugs must be sent by email to <hamdankhan212@gmail.com>.

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [Issue](https://github.com/Hamdan-khan/zero-sketch/issues/new).
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the *reproduction steps* that someone else can follow to recreate the issue on their own. This usually includes your code. For good bug reports you should isolate the problem and create a reduced test case.
- Provide the information you collected in the previous section.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for ZeroSketch, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

#### Before Submitting an Enhancement

- Find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search](https://github.com/Hamdan-khan/zero-sketch/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. Keep in mind that we want features that will be useful to the majority of our users.

#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/Hamdan-khan/zero-sketch/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots or screen recordings** which help you demonstrate the steps or point out the part which the suggestion is related to.
- **Explain why this enhancement would be useful** to most ZeroSketch users.


### Repository Structure

ZeroSketch is organized as a `pnpm` monorepo:

- **`apps/`**
  - **`web`**: Main application hosting the canvas and library management.
  - **`marketing`**: ZeroSketch landing page.
- **`packages/`**
  - **`canvas`**: Canvas component and interactive canvas logic.
  - **`models`**: Library registry logic, data models, and shared types.
  - **`common`**: Shared themes, utilities, and constants.
- **`libraries/`**: Icon libraries.


### Your First Code Contribution

1. **Prerequisites**
   Make sure you have Node.js and pnpm installed (pnpm v11 is recommended):
   ```sh
   npm install -g pnpm
   ```

2. **Clone the Repository**
   ```sh
   git clone https://github.com/Hamdan-khan/zero-sketch.git
   cd zero-sketch
   ```

3. **Install Dependencies**
   ```sh
   pnpm install
   ```

4. **Environment Setup**
   Copy the sample environment configuration files for the web app or canvas dev environment:
   ```sh
   # web app
   cp apps/web/sample.env apps/web/.env

   # canvas package
   cp packages/canvas/dev/sample.env packages/canvas/dev/.env
   ```

5. **Run the Development Server**
   Start the web app locally:
   ```sh
   pnpm --filter web dev
   ```
   Or start the canvas package's dev server:
   ```sh
   pnpm --filter @zero-sketch/canvas dev
   ```

6. **Linting, Formatting & Testing**
   Before committing your changes, make sure all checks pass:
   - **Linting**: Check for lint errors using `pnpm lint` (or auto-fix with `pnpm lint:fix`).
   - **Formatting**: Format the codebase using `pnpm format`.
   - **Testing**: Run tests using `pnpm test` (or `pnpm test:coverage` for test coverage).
