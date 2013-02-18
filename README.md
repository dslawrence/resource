jquery.resource.js
========

jQuery plugin for loading JavaScript, CSS &amp; HTML resources into a page.

 * All JavaScript and HTML files will be loaded prior to "callback" being run.
 * Multiple calls for the same resource will _not_ result in multiple loads,
   even if the calls are simultaneous. They will all wait for the intial load,
   or they proceed immediately if the resource has already been loaded.
 * Scripts are run when they are loaded.
 * HTML is inserted into the DOM in a hidden div (for template use).
 * Callback is not required.

Example Syntax
=========================

$.resource( [
  	"/script/one.js",
  	"/script/two.js",
  	"/css/file.css",
  	"/html/template.html"
	],
	function() { //callback }
);

Dependencies
==========================================
*   [jQuery](http://jquery.com/)

