!function() {

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
        , fs            = require('fs')
        , path          = require('path')
        , Promise       = (Promise || require('es6-promise').Promise)
        , exec          = require('child_process').exec;




	module.exports = new Class({


		init: function(options) {
            this._path = process.env.PWD;

            this._packagePath = path.join(this._path, 'package.json');


            if (process.argv.indexOf('minor') >= 0) this._minor = true;
            if (process.argv.indexOf('major') >= 0) this._major = true;

            this._message = (this._minor || this._major) ? process.argv[3] : process.argv[2];

            if (!this._message) return log.warn('Failed: commit message not found!');


            this.checkEnvironment().then(function() {
                this.run();
            }.bind(this)).catch(function(err) {
                log.error('Failed: '+err.message);
            }.bind(this));
		}



        /**
         * do it!
         */
        , run: function() {
            var   parts = this._package.version.split('.')
                , mode = (this._major ? 'major' : (this._minor ? 'minor' : 'none'))
                , newVersion;


            switch (mode) {
                case 'major':
                    parts[0] = parseInt(parts[0], 10)+1;
                    parts[1] = '0';
                    parts[2] = '0';
                    break;

                case 'minor':
                    parts[1] = parseInt(parts[1], 10)+1;
                    parts[2] = '0';
                    break;

                case 'none':
                    parts[2] = parseInt(parts[2], 10)+1;
                    break;
            }



            newVersion = parts.join('.');

            // update package.json
            fs.readFile(this._packagePath, function(err, data) {
                if (err) log.warn('Failed to load package.json!');
                else {
                    data = data.toString().replace(new RegExp('("version"\\s*:\\s*")'+this._package.version+'(")', 'gi'), '$1'+newVersion+'$2');

                    log.info('Updating package.json ...');
                    fs.writeFile(this._packagePath, data, function(err) {
                        if (err) log.error('Failed to update package.json: '+err.message);
                        else {
                            log.info('git commit -am ...');
                            this.exec('git commit -am "'+this._message+'"').then(function() {

                                log.info('git push ...');
                                return this.exec('git push origin master');
                            }.bind(this)).then(function() {

                                log.info('Git tag -a v'+newVersion+' -m ...');
                                return this.exec('git tag -a v'+newVersion+' -m "'+this._message+'"');
                            }.bind(this)).then(function() {

                                log.info('git push origin v'+newVersion+' ...');
                                return this.exec('git push origin v'+newVersion);
                            }.bind(this)).then(function() {
                                log.highlight('done!');
                            }.bind(this)).catch(function(err) {
                                log.error('command failed: '+ err.message);
                            }.bind(this));
                        }
                    }.bind(this));
                }
            }.bind(this));
        }




        /**
         * check if everything is set up correctly
         */
        , checkEnvironment: function() {
            // echk for git
            return this.exec('git status').then(function() {
                // package.json
                try {
                    this._package = require(this._packagePath);
                } catch (err) {
                    err.message = 'Failed to load package.json: '+err.message;
                    return Promise.reject(err);
                }

                return Promise.resolve();
            }.bind(this));
        }




        /**
         * execute a command
         */
        , exec: function(command) {
            return new Promise(function(resolve, reject) {
                exec(command, function(err, stdout, stderr) {
                    if (err) reject(err);
                    else resolve(stdout);
                }.bind(this));
            }.bind(this));
        }
	});
}();
