// Usage:
// $.resource( [ 
//		"/script/one.js",
//		"/script/two.js",
//		"/css/file.css",
//		"/html/template.html"
//	],
//  function() { //callback } 
// );

// * All JavaScript and HTML files will be loaded prior to "callback" being run.
// * Multiple calls for the same resource will _not_ result in multiple loads,
//   even if the calls are simultaneous. They will all wait for the intial load,
//   or they proceed immediately if the resource has already been loaded.
// * Scripts are run when they are loaded.
// * HTML is inserted into the DOM in a hidden div (for template use)

(function($) {

	var resource={
		pending: {},
		loaded: {},
		htmlDivAdded: 0,
		htmlBase: '',
		scriptBase: '',
		cssBase: '',
		synchronous: 0,
		method: 'script',

		init:function( args ) {
			if (args) {
				this.set(args);
			}
		},

		set:function( args ) {

			var possibleArgs=[ 'htmlBase','scriptBase','cssBase','synchronous' ];

			for (var i in possibleArgs) {
				if (args[possibleArgs[i]]) {
					this[possibleArgs[i]]=args[possibleArgs[i]];
				}
			}

			if (args.loaded) {
				$.each( args.loaded, function(index, value) {
					this.loaded[value]=1;
				});
			}

		},

		load:function() {
			
			var self=this;
			var finished=0;

			var files;
			var callback;

			files=arguments[0];

			// if second argument is a string or an array, create our own callback
			if (typeof arguments[1]=='string' || typeof arguments[1]=='object') {
				var nextArguments=[];
				for (var i=1; i<arguments.length; i++) {
					nextArguments.push( arguments[i] );
				}
				callback=function() {
					self.load.apply( self, nextArguments );
				}
			} else if (typeof arguments[1]=='function' ) {
				callback=arguments[1];
			}

			// Create object from the single script if that's what we have
			if (typeof files!='object') {
				files=[ files ];
			}

			// Set up an empty resolved deferred
			var when=$.when();

			$.each( files, function(index, value) {
				if (self.pending[value]) {

					// If already pending then add that deffered to the chain
					when=$.when( self.pending[value], when );

				} else {

					// If a new request, add the ajax request deferred to the queue
					when=$.when( self.load_inner( value, '', self.synchronous ), when );

				}
			});

			// Don't run the callback until all deferreds are resolved
			when.then(function() {
				finished=1;
				if (callback) { callback(); }
			});
		},

		load_inner:function( file, callback, synchronous ) {

			var type;
			var isRelative=false;
			var self=this;

			if (!(file.match(/^\/|:/))) {
				isRelative=true;
			}

			// CSS
			if (file.match(/\.css/)) {

				type='css';
				if (isRelative) {
					file=self.cssBase+file;
				}

			} else if (file.match(/\.js/)) {
				type='js';
				if (isRelative) {
					file=self.scriptBase+file;
				}

			} else if (file.match(/\.(gif|jpe?g|png|ico)$/i)) {
				type='img';
				if (isRelative) {
					//file=self.scriptBase+file;
				}

			} else {
				type='html';
				if (isRelative) {
					file=self.htmlBase+file;
				}

			}

			if (this.loaded[file]) {

				if (callback) {
					callback();
				}

			} else {

				var self=this;

				// CSS
				if (type=='css') {


					// Set up the deferred
					self.pending[file]=$.Deferred();
					self.pending[file].done(function() {
						self.pending[file]=0;
						self.loaded[file]=1;
						if (callback) {
							callback();
						}
					});

					// only append to body if body is there
					$(function() {

						var css = document.createElement("link")
						css.type = "text/css";
						css.rel = "stylesheet";

						// For now, just consider it loaded
						setTimeout(function() {
							self.pending[file].resolve();
						},100);

						css.href = file;

						document.body.appendChild(css);

					});

					return self.pending[file];

				// JavaScript
				} else if (type=='js') {

					// Set up the deferred
					self.pending[file]=$.Deferred();
					self.pending[file].done(function() {
						self.pending[file]=0;
						self.loaded[file]=1;
						if (callback) {
							callback();
						}
					});

					// only append to body if body is there
					$(function() {

						var script = document.createElement("script")
						script.type = "text/javascript";

						// Load the script
						if (script.readyState){	//IE
							script.onreadystatechange = function(){
								if (script.readyState == "loaded" || script.readyState == "complete"){
									script.onreadystatechange = null;
									self.pending[file].resolve();
								}
							};
						} else {	//Others
							script.onload = function(){
								self.pending[file].resolve();
							};
						}

						script.src = file;

						document.body.appendChild(script);
					});

					return self.pending[file];
					
				// Images
				} else if (type=='img') {

					if (!self.imagecache) {
						self.imagecache = {};
					}
					var image = new Image();
					//var image = document.createElement("img")
					self.imagecache[file] = image;

					// Set up the deferred
					self.pending[file]=$.Deferred();
					self.pending[file].done(function() {
						self.pending[file]=0;
						self.loaded[file]=1;
						if (callback) {
							callback();
						}
					});

					// wait for body
					$(function() {

						// For now, just consider it loaded
						setTimeout(function() {
							self.pending[file].resolve();
						},100);

						image.src = file;

					});

					return self.pending[file];

				// HTML
				} else {

          // Already done? OK!
          if (self.loaded[file]) {
            return;
          }

          // Already pending? Return that!
          if (self.pending[file]) {
            return self.pending[file];
          }

					var ajaxArgs={
						type: 'GET',
						url: file,
						success:function( data ) {
							self.pending[file]=0;
							self.loaded[file]=1;

							// Don't try appending until all is ready
							$(function() {
								// Be sure to add the div to store them in if it isn't there yet
								if ( !(self.htmlDivAdded) ) {
									self.htmlDivAdded=1;

									// Not sure why we need this, but the page renders the script text otherwise
									$('body').append('<div id="jquery_resource_container" style="display:none;"></div>');
								}

								$('#jquery_resource_container').append(data);

								if (callback) {
									callback();
								}
								//events.trigger('require:htmlLoaded',{ file: file });
							});
						},
						error:function( xhr, errorText ) {

							// register as loaded anyway so we don't keep trying
							self.pending[file]=0;
							self.loaded[file]=1;

							throw new Error( "Couldn't load: "+file+" ("+errorText+")");
						}
					};

					if (this.synchronous || synchronous) {
						ajaxArgs['async']=false;
					}

					// Check again...

          // Already done? OK!
          if (self.loaded[file]) {
            return;
          }

          // Already pending? Return that!
          if (self.pending[file]) {
            return self.pending[file];
          }


					// Store the ajax deferred in the list of pending stuff
					self.pending[file]=$.ajax( ajaxArgs );

					return self.pending[file];

				}

				return $.when();
			}
		}
	}

	resource.init();

  $.resource = function( ) {
		if (typeof arguments[0]=='string' && arguments[0]=='options') {

			resource.set(arguments[1]); // set options
			return this;

		} else {

			// pass all arguments along to resource.load using "apply"
			resource.load.apply( resource, arguments );
			//resource.load( arguments );
			return this;

		}
	}
})(jQuery);
