# Railroad Studio
This repository contains the source code for [railroad.studio](https://railroad.studio/).

## About
Railroad Studio is a static HTML, JavaScript and CSS webpage used to view and modify save files for Railroads Online.

## Development

### Requirements
The build script uses the node package manager `npm` to manage build dependencies. See [Downloading and installing npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for more information about how to configure npm for your platform.

Once installed, run `npm install` to install the necessary node package dependencies.

### Building
Run `npm start` to start the webpack-dev-server.

### Testing
Navigate to [http://localhost:8080/](http://localhost:8080/) to perform testing.

### Debugging
Source mappings are created, so you can use the web browser's native debugger.

### Releasing
To generate a minified `studio.js` for release, run `npm run build:prod`.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT License](LICENSE).
