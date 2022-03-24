# Railroad Studio
This repository contains the source code for [railroad.studio](https://railroad.studio/).

## About
Railroad Studio is a static HTML, JavaScript and CSS webpage used to view and modify save files for Railroads Online.

## Development

### Requirements
The build script uses the node package manager `npm` to manage build dependencies. See [Downloading and installing npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for more information about how to configure npm for your platform.

Once installed, run `npm install` to install the necessary node package dependencies.

### Building
Run `npm run build` to execute the linter and compile the TypeScript code.

When making changes to the code, it can be useful to run the typescript compiler in watch mode `tsc --watch` to rebuild typescript source files automatically. Note that this will bypass the linter, so remember to address any linter warnings before committing code.

### Testing
After building, `open railroad.studio/index.html` to launch the page.

### Debugging
The typescript compiler creates a `studio.js.map` file that web browsers use to natively display typescript-mapped source code and stack traces.

### Releasing
To generate a minified `studio.js` for release, run `npm run build:prod`.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT License](LICENSE).
