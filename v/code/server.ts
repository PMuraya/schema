//
//Resolve the mutall error class, plus access to the application url
import {mutall_error, schema} from "./schema.js";
// 
//We need the library dts to support the parametarization of the 
//sever methods 
import * as library from "./library.js";

//
//Simplifies the windows equivalent fetch method with the following 
//behaviour.
//If the fetch was successful, we return the result; otherwise the fetch 
//fails with an exception.
//partcular static methods are specifed static:true....
//It returns the same as result as the method  in php 
export async function exec<
    // 
    //Convert the library namespace to a type. It comprises of classes organized
    //as an interface e.g.,
    //classes = interface library {database:object, record:object, node:object }
    classes extends typeof library,
    //
    //The class names are the keys of classes. Get the using the keyof operator.
    //The resulting type is string|number. In order to comply with the 
    //formdata.append parameters i.e.,string|blob, filter out the numbers, to be
    //left with strings
    class_name extends Extract<keyof classes, string>,
    //
    //Get the actual (static) class that is indexed by the class name; it also 
    //should be a constructor
    $class1 extends classes[class_name],
    //
    //In additin, class1 must satisfy a constructor type.
    //N.B. Interesection does not give us the correct behaviour.
    $class extends $class1 extends {new(...args:any):any} ? $class1 : never, 
    // 
    //Get thhe constructor parameters.
    cargs extends ConstructorParameters<$class>,
    //
    //get teh constructed instance
    instance extends InstanceType<$class>,
    // 
    //The object method must be a string. Filter out the numbers
    method_name extends Extract<keyof instance,string>,
    // 
    //Get the actual, i.e., indexed method
    method1 extends instance[method_name],
    //
    //The methods must satisfy the function type
    method extends method1 extends (...args: any) => any ?method1: never,
    //
    //Retrieve the arguments from the method
    margs extends Parameters<method>,
    // 
    //Get the return type of the method
    $return extends ReturnType<method>
    /*
    NAMING THE GENERIC PARAMETERS EXACTLY LIKE THE FUNCTION ARGUMENTS SEEMS
    TO CONFUSE THE INTELLISENSE. HENCE THE CAPITLAIZATION OF THE FIRST LETTER
    IT WAS THE SOLUTION TO AN AGE-OLD PPROBLEM 
    */
    >(
        //
        //The class of the php class to execute.
        Class_name: class_name,
        //
        Cargs: cargs,
        //
        Method_name: method_name,
        //
        Margs: margs,
        //
        //The current working directory. Important for resolving relative paths
        cwd?:string
    ): Promise<$return> {
    //
    //Call the non parametric form of exec
    return await exec_nonparam(Class_name, Method_name, Margs, Cargs, cwd);
 }


//
//Upload the given file to the server at the given folder. The return value is 
//either 'ok' or an error if the uploading failed for any reason 
export async function upload_files(
    //
    //The files to upload
    files: FileList,
    //
    //The path where to upload
    destination: string,
    //
    //What to do if the file already exist. The default is report
    action:'overwrite'|'report'|'skip' = 'report'
): Promise<'ok'|Error> {
    //
    //Create a form for transferring data, i..e, content plus metadata, from 
    //client to server
    const form = new FormData();
    //
    // Add the files to the form
    for (let i = 0; i < files.length; i++) form.append("files[]", files[i]);
    //
    //Add the other upload input arguments to the form. Include the fact that
    //we are uplolading files (not executing PHP code)
    form.append('inputs',  JSON.stringify({destination, action}));
    //
    //Indicate to index.php that we intened to upload file, rather than execute
    //a php class method
    form.append('upload_files', 'true');
    //
    //Use the form with a post method to get ready to fetch
    const options: RequestInit = { method: "post", body: form};
    //
    //Transfer control to the php side
    const response: Response = await fetch('/schema/v/code/index.php', options);
    //
    //Test if fetch was succesful or not; if not alert the user with an error
    if (!response.ok) throw "Fetch request failed for some (unknown) reason.";
    //
    //Get the text that was echoed by the php file
    const result: string = await response.text();
    //
    //Alert the result in case of error
    if (result === "ok") return "ok"; else return new Error(result);
}
//
//The ifetch function is used for executing static methods on php class
export async function ifetch<
    //
    //Define a type for... 
    //...the collection of classes in the library namespace.
    classes extends typeof library,
    // 
    //...all the class names that index the classes.
    class_name extends Extract<keyof classes, string>,
    // 
    //...a class in the library name spaces
    $class extends classes[class_name],
    // 
    //...a static method name of class in the library namespace 
    method_name extends Extract<keyof $class, string>,
    // 
    //...a static method of a $class in the library namespace
    method extends Exclude<
        Extract<$class[method_name], (...args: any) => any>,
        "prototype"
    >,
    // 
    //...input parameters of a method of a class in the library namespace 
    $parameters extends Parameters<method>,
    // 
    //...a return value of a method of a class in the library namespace 
    $return extends ReturnType<method>

>(
    //
    //The class of the php object to use.
    class_name: class_name,
    //
    //The static method name to execute on the class. 
    method_name: method_name,
    //
    //The method parameters
    margs: $parameters
): Promise<$return> {
    //
    //Call the non parametric form of exec, without any constructor 
    //arguments
    return await exec_nonparam(class_name,method_name,margs);
}

//
//This is the non-parametric version of exec useful for calling both the static
//and object version of the given php class
export async function exec_nonparam(
    //
    //This is the name of the php class to create
    class_name: string,
    //
    //The method to execute on the php class
    method_name:string,
    //
    //The arguements of the method
    margs:Array<any>,
    //
    //If defined, this parameter represents the constructor arguements for the 
    //php class. It is undefined for static methods.
    cargs:Array<any>|null=null,
    //
    //The current working directory
    cwd?:string
 ): Promise<any>{
    //
    //Prepare to collect the data to send to the server
    const formdata = new FormData();
    //
    //Add the application URL from the schema class. (See the new approach
    //below)
    formdata.append("url", schema.app_url);
    //
    //Add the current working directory, if available. This will replace the
    //need for reading the app_url from a setup file
    if (cwd) formdata.append("cwd", cwd);
    //
    //Add to the form, the class to create objects on the server
    formdata.append('class', class_name);
    //
    //Add the class constructor arguments if they are defined
    if (cargs === null ){
        //
        //The method on the php class is static
        formdata.append('is_static', 'true');
    }
    else{
        //
        //The method on the php class is an object method
        formdata.append('cargs', JSON.stringify(cargs));
    }
    //
    //Add the method to execute on the class
    formdata.append('method', method_name);
    //
    //Add the method parameters 
    formdata.append('margs', JSON.stringify(margs));
    //
    //Prepare  to fetch using a post
    const init = {
        method: 'post',
        body: formdata
    };
    //
    //Fetch and wait for the response, using the (shared) export file
    const response = await fetch('/schema/v/code/index.php', init);
    //
    //Get the text from the response. This can never fail
    const text = await response.text();
    //
    //The output is expected to be a json string that has the following 
    //pattern: {ok:boolean, result:any, html:string}. If ok, the 
    //result is that of executing the requested php method; otherise it
    //is an error message. htm is any buffered warnings.
    let output:{ok:boolean, result:any, html:string}; 
    //
    //The json might fail (for some reason, e.g., an Exception durinh PHP execution)
    try {
        //Try to convert the text into json
        output = JSON.parse(text);
    }
    //
    //Invalid json; ignore the json error. Report the text as it is. It may
    //give clues to the error
    catch (ex) {
        //
        throw new mutall_error(text);
    }
    //
    //The json is valid.
    // 
    //Test if the requested method ran successfully or not
    if(output.ok) return output.result;
    //
    //The method failed. Report the method specific errors. The result
    //must be an error message string
    const msg= <string>output.result;
    // 
    //Report the error and log teh result. 
    throw new mutall_error(msg, output.result);
}
