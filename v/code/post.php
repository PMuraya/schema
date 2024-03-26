<?php

namespace mutall;
//
//Catch all errors, including warnings.
\set_error_handler(function($errno, $errstr, $errfile, $errline /*, $errcontext*/) {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});
//
//The schema is the base of all our applications; it is primarily used for
//supporting the database class. 
include_once $_SERVER['DOCUMENT_ROOT'].'/schema/v/code/schema.php';
include_once $_SERVER['DOCUMENT_ROOT'].'/schema/v/code/questionnaire.php';
//
//Define the location of the post file
$post = $_SERVER['DOCUMENT_ROOT'].'/schema/v/code/post.json';
//
//Set the globals from the post file
mutall::set_globals($post);
//
//Show the the inputs
//echo "<pre>".json_encode($GLOBALS)."</pre>";
//
//Execute the posted request and show the result
$result = mutall::fetch();
echo "<pre>".json_encode($result)."</pre>";
