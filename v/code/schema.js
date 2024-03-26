//Mechamism for schema to access the mutall library 
import { view, mutall_error } from "./../../../outlook/v/code/view.js";
//
//Re-export mutall error (for backward compatibility)
export { mutall_error };
//
//The name-indexed databases accessible through this schema. This typically
//comprises of the mutall_users database and any other database opened by
//an application.
export const databases = {};
//
//Schema is the root class of objects derived from a database's information 
//schema. These are examples of such objects:-a database, an entitiy/table, an 
//index, a column, etc.. Its main functions are:-
//--to implement a common mechanism for handling errors arising from both the 
// PHP and TS namespaces
//--to act as a home for schema-related static methods that can be accessed 
//globally
//Schema is a view; this feature allows us to represent objects visually, e.g., 
// the metavisuo application
export class schema extends view {
    static_data;
    parent;
    //
    //Tracking/Handling errors generated from both the server (in PHP) and client 
    //(Javascricpt) side of a mutall_data application
    errors;
    //
    //Define a globally accessible application url for supporting the working of
    //PHP class autoloaders. The url enables us to identify the starting folder 
    //for searching for PHP classes. Who sets it?
    static app_url;
    //
    //A private svg element that is used to support the svg getter
    __svg;
    //
    //That is the purposes of the
    //parent property. The To create a schema we require a unique identification also called a partial 
    //name described above. The default is no name
    constructor(
    //
    //The data imported from the server side (typically in PHP) needed for
    //construction a schema object. It holdes the errors emanating from the 
    //PHP side
    static_data, 
    //
    //Schema elemets are chain in a has-a hierarchy. Currently database is 
    //at the root of such a hierarchy. In future, server will be the root.
    //What is the purpose of the hierarchy? 
    parent) {
        //
        //Initialize the view system
        super();
        this.static_data = static_data;
        this.parent = parent;
        //
        //Offload all the properties in the given static structure. You may need 
        //to re-declare the important properties so that typescript can see them
        Object.assign(this, static_data);
        //
        //Convert php to javascript-comptible version
        this.errors = this.activate_errors(static_data.errors);
    }
    //Activate errors using the static version, if it exist. This converts php 
    //to javascript-comptible version
    activate_errors(errors) {
        //
        //Convert a php error to myerror versions
        return errors.map(error => ({
            message: error._message,
            stack: error._stack
        }));
    }
}
//Is a mutall object that models a database class. Its key feature is the 
//collection of entities.
export class database extends schema {
    static_dbase;
    //
    //A collection of entities/tables for this database indexed by their names
    entities;
    //
    //Construct the database from the given static database structure imported
    //from PHP
    constructor(
    //
    //The static dbase that is used to create this database is derived from php
    //version. It is important when we need to extend a database 
    static_dbase) {
        //
        //For his version, a database has no parent. In the next version, the
        //parent of a database will be a server.
        super(static_dbase);
        this.static_dbase = static_dbase;
        //
        //Activate the entities, resulting in the collection of schema entities
        //indxed by entity name 
        this.entities = this.activate_entities();
        //
        //Register the database to global collection of databases
        databases[this.name] = this;
    }
    //
    //Activate the static collection of entities to active versions
    activate_entities() {
        //
        //start with an empty object
        const entities = {};
        //
        //Loop through all the static entities and activate each one of them 
        for (let ename in this.static_dbase.entities) {
            //
            //Create the active entity, passing this database as the parent
            const active_entity = new entity(this, ename);
            //
            //Replace the static with the active entity
            entities[ename] = active_entity;
        }
        //
        //Return the entities of this database
        return entities;
    }
    //
    //Returns the entity if is found; otherwise it throws an exception
    get_entity(ename) {
        //
        //Get the entity from the collection of entities in the map
        //used the $entity so as not to conflict with the class entity 
        const Entity = this.entities[ename];
        //
        //Take care of the undeefined situations by throwing an exception
        //if the entity was not found
        if (Entity === undefined) {
            //
            throw new mutall_error(`Entity ${ename} is not found`);
        }
        else {
            return Entity;
        }
    }
    // 
    //Retrive the user roles from this database. 
    //A role is an entity that has a foreign key that references the 
    //user table in mutall users database.
    //The key and value properties in the returned array represent the 
    //short and long version name of the roles.
    get_roles() {
        //
        //Get the list of entities that are in this database
        const list = Object.values(this.entities);
        //
        //Select from the list only those entities that refer to a user.
        const interest = list.filter(Entity => {
            //
            //Loop throuh all the columns of the entity, to see if there is any
            //that links the entity to the user. NB: Entity (in Pascal case) is 
            //a variable while entity (in Snake case) is a class name
            for (let cname in Entity.columns) {
                //
                //Get the named column 
                const col = Entity.columns[cname];
                //
                //Skip this column if it is not a foreign key
                if (!(col instanceof foreign))
                    continue;
                //
                //The foreign key column must reference the user table in the 
                //user database; otherwise skip it. NB. This comparsion below
                //does not give the same result as col.ref === entity.user. Even
                //the loose compasrison col.ref==entity.user does not give the
                //the expected results. Hence thos lonegr version
                if (col.ref.dbname !== entity.user.dbname)
                    continue;
                if (col.ref.ename !== entity.user.ename)
                    continue;
                //
                //The parent entity must be be serving the role function. D no more
                return true;
            }
            //
            //The entity cannot be a role one
            return false;
        });
        //
        //Map the entities of interest into outlook choices pairs.
        const roles = interest.map(entity => {
            //
            //Get teh name element
            const name = entity.name;
            //
            //Return the complete role structure
            return { name, value: name };
        });
        return roles;
    }
}
//An entity is a mutall object that models the table of a relational database
export class entity extends schema {
    dbase;
    //
    //Every entity has a collection of column inmplemented as maps to ensure type integrity
    //since js does not support the indexed arrays and yet columns are identified using their 
    //names.
    //This property is optional because some of the entities eg view i.e selectors do not have 
    //columns in their construction  
    columns;
    // 
    //The long version of a name that is set from this entity's comment 
    title;
    //
    //Define the identification index fields in terms of column objects. This
    //cannot be done at construction time (because the order of building 
    //database entities is not guranteed to follow dependency). Hence its 
    //optional
    ids_;
    //A reference to the user database (that is shared by all databases in this 
    //server)
    static user = { dbname: 'mutall_users', ename: 'user' };
    //
    //Store the static/inert version of this entity here
    //public static_entity:Ientity;
    //
    //Construct an entity using:-
    //a) the database to be its parent through a has-a relationship
    //b) the name of the entity in the database
    constructor(
    //
    //The parent of this entity which is the database establishing the reverse 
    //connection from the entity to its parent. it is protected to allow this 
    //entity to be json encoded. Find out if this makes any diference in js 
    //The datatype of this parent is a database since an entity can only have 
    //a database origin
    dbase, 
    //
    //The name of the entity
    name) {
        //Initialize the parent so thate we can access 'this' object
        super(dbase.static_dbase.entities[name], dbase);
        this.dbase = dbase;
        //
        //Use the static column data to activate them to javascript column objects
        this.columns = this.activate_columns();
    }
    //Activate the columns of this entity where the filds are treated just like 
    //attributes for display
    activate_columns() {
        //
        //Begin with an empty object collection
        let columns = {};
        //
        //Loop through all the static columns and activate each of them
        for (let cname in this.static_data.columns) {
            //
            //Get the static column
            let static_column = this.static_data.columns[cname];
            //
            switch (static_column.class_name) {
                //
                case "primary":
                    columns[cname] = new primary(this, static_column);
                    break;
                case "attribute":
                    columns[cname] = new attribute(this, static_column);
                    break;
                case "foreign":
                    columns[cname] = new foreign(this, static_column);
                    break;
                default:
                    throw new mutall_error(`Unknown column type 
                    '${static_column.class_name}' for ${this.name}.${cname}`);
            }
        }
        return columns;
    }
    //Returns the named column of this entity; otherwise it cratches
    get_col(cname) {
        //
        //Retrieve the named column
        const col = this.columns[cname];
        //
        //Report eror if column not found
        if (col === undefined)
            throw new mutall_error(`Column ${this}.${cname} is not found`);
        //
        return col;
    }
    //Defines the identification columns for this entity as an array of columns this 
    //process can not be done durring the creation of the entity since we are not sure 
    //about the if thses column are set. hence this function is a getter  
    get ids() {
        //
        //Return a copy if the ides are already avaible
        if (this.ids_ !== undefined)
            return this.ids_;
        //
        //Define ids from first principles
        //
        //Use the first index of this entity. The static index imported from 
        //the server has the following format:-
        //{ixname1:[fname1, ...], ixname1:[....], ...} 
        //We cont know the name of the first index, so we cannot access directly
        //Convert the indices to an array, ignoring the keys as index name is 
        //not important; then pick the first set of index fields
        if (this.indices === undefined) {
            return undefined;
        }
        //
        const fnames = this.indices[0];
        //
        //If there are no indexes save the ids to null and return the null
        if (fnames.length === 0) {
            return undefined;
        }
        //
        //Activate these indexes to those from the static object structure to the 
        //id datatype that is required in javascript 
        // 
        //begin with an empty array
        let ids = [];
        // 
        //
        fnames.forEach(name => {
            //
            //Get the column of this index
            const col = this.columns[name];
            if (col === undefined) { }
            else {
                ids.push(col);
            }
        });
        return ids;
    }
    //Returns the relational dependency of this entity based on foreign keys
    get dependency() {
        //
        //Test if we already know the dependency. If we do just return it...
        if (this.depth !== undefined)
            return this.depth;
        //
        //only continue if there are no errors 
        if (this.errors.length > 0) {
            return undefined;
        }
        //...otherwise calculate it from 1st principles.
        //
        //Destructure the identification indices. They have the following format:-
        //[{[xname]:[...ixcnames]}, ...]
        //Get the foreign key column names used for identification.
        //
        //we can not get the ddependecy of an entity if the entity has no ids 
        if (this.ids === undefined) {
            return undefined;
        }
        //
        //filter the id columns that are foreigners
        let columns = [];
        this.ids.forEach(col => { if (col instanceof foreign) {
            columns.push(col);
        } });
        //
        //Test if there are no foreign key columns, return 0.
        if (columns.length === 0) {
            return 0;
        }
        else {
            //Map cname's entity with its dependency. 
            const dependencies = columns.map(column => {
                //
                //Get the referenced entity name
                const ename = column.ref.ename;
                //
                //Get the actual entity
                const entity = this.dbase.get_entity(ename);
                //
                //Get the referenced entity's dependency.
                return entity.dependency;
            });
            //
            //remove the nulls
            const valids = dependencies.filter(dep => { return dep !== null; });
            //
            //Get the foreign key entity with the maximum dependency, x.
            const max_dependency = Math.max(...valids);
            //
            //Set the dependency
            this.depth = max_dependency;
        }
        //
        //The dependency to return is x+1
        return this.depth;
    }
    //The toString() method of an entity returnsthe fully spcified, fully quoted name, fit
    //for partcipatin in an sql. E.g., `mutall_users`.`intern`
    toString() {
        return '`' + this.dbase.name + '`' + "." + '`' + this.name + '`';
    }
    //Collect pointers to this entity from all the available databases
    *collect_pointers() {
        //
        //For each registered database....
        for (const dbname in databases) {
            //
            //Get the nameed database
            const dbase = databases[dbname];
            //
            //Loop through all the entity (names) of the database
            for (const ename in dbase.entities) {
                //
                //Loop through all the columns of entity
                for (const cname in dbase.entities[ename].columns) {
                    //
                    //Get the named column
                    const col = dbase.entities[ename].columns[cname];
                    //
                    //Only foreign keys are considered
                    if (!(col instanceof foreign))
                        continue;
                    //
                    //The column's reference must match the given subject
                    if (col.ref.dbname !== this.dbase.name)
                        continue;
                    if (col.ref.ename !== this.name)
                        continue;
                    //
                    //Collect this column
                    yield col;
                }
            }
        }
    }
}
//Modelling the column of a table. This is an absract class. 
export class column extends schema {
    entity;
    //
    //Boolean that tests if this column is primary 
    is_primary;
    // 
    //This is the descriptive name of this column 
    //derived from the comment 
    title;
    //
    //The construction details of the column includes the following
    //That are derived from the information schema  and assigned 
    //to this column;- 
    //
    //Metadata container for this column is stored as a structure (i.e., it
    //is not offloaded) since we require to access it in its original form
    comment;
    //
    //The database default value for this column 
    default;
    //
    //The acceptable datatype for this column e.g the text, number, autonumber etc 
    data_type;
    //
    //Determines if this column is optional or not.  if nullable, i.e., optional 
    //the value is "YES"; if mandatory, i.e., not nullable, the value is 
    //"NO"
    is_nullable;
    // 
    //The maximum character length
    length;
    //
    //The column type holds data that is important for extracting the choices
    //of an enumerated type
    type;
    // 
    //The following properties are assigned from the comments  field;
    // 
    //This property is assigned for read only columns 
    read_only;
    //
    //These are the multiple choice options as an array of key value 
    //pairs. 
    select;
    //
    //The value of a column 
    value;
    //
    //The class constructor that has entity parent and the json data input 
    //needed for defining it. Typically this will have come from a server.
    constructor(entity, static_column) {
        //
        //Initialize the parent so that we can access 'this' object
        super(static_column, entity);
        this.entity = entity;
        //
        //Primary keys are special; we neeed to identify them. By default a column
        //is not a primary key
        this.is_primary = false;
        //
        //Thos part aws originally wriiten using the Object.asign() method which
        //did not work a the schema level
        //Object.assign(this, static_column);
        this.title = static_column.title;
        this.comment = static_column.comment;
        this.default = static_column.default;
        this.is_nullable = static_column.is_nullable;
        this.data_type = static_column.data_type;
        this.length = static_column.length;
        this.type = static_column.type;
    }
    //Returns true if this column is used by any identification index; 
    //otherwise it returns false. Identification columns are part of what is
    //known as structural columns. This is important for he questinnaire system.
    is_id() {
        //
        //Get the indices of the parent entity 
        const indices = this.entity.indices;
        //
        //Test if this column is used as an index. 
        for (const name in indices) {
            //
            //Get the named index
            const cnames = indices[name];
            //
            //An index consists of column names; test if the name of this column
            //is included. If its , then this colum is used for identification. 
            if (cnames.includes(this.name))
                return true;
        }
        //This column is not used for identification
        return false;
    }
    //The string version of a column is used for suppotring sql expressions
    toString() {
        //
        //Databasename quoted with backticks
        const dbname = '`' + this.entity.dbase.name + '`';
        //
        //Backtik quoted entity name
        const ename = '`' + this.entity.name + '`';
        //
        //The backkicked column name;
        const cname = '`' + this.name + '`';
        //
        return `${dbname}.${ename}.${cname}`;
    }
}
//Modelling the non user-inputable primary key field
export class primary extends column {
    //
    //The class contructor must contain the name, the parent entity and the
    // data (json) input 
    constructor(parent, data) {
        //
        //The parent colum constructor
        super(parent, data);
        //
        //This is a primary key; we need to specially identify it.
        this.is_primary = true;
    }
}
//Modellig foreign key field as an inputabble column.
export class foreign extends column {
    //
    //The reference that shows the relation data of the foreign key. It comprises
    //of the referenced database and table names
    ref;
    //
    //Construct a foreign key field using :-
    //a) the parent entity to allow navigation through has-a hierarchy
    //b) the static (data) object containing field/value, typically obtained
    //from the server side scriptig using e.g., PHP.
    constructor(parent, static_column) {
        //
        //Save the parent entity and the column properties
        super(parent, static_column);
        //
        //Extract the reference details from the static data
        this.ref = {
            ename: static_column.ref.table_name,
            dbname: static_column.ref.db_name
        };
    }
    //The referenced entity of this relation will be determined from the 
    //referenced table name on request, hence the getter property
    get_ref_entity() {
        //
        //Let n be table name referenced by this foreign key column.
        const n = this.ref.ename;
        //
        //Return the referenced entity using the has-hierarchy
        return this.entity.dbase.entities[n];
    }
    //Tests if this foreign key is hierarchical or not
    is_hierarchical() {
        //
        //A foreign key represents a hierarchical relationship if the reference...
        //
        return (
        //...database and the current one are the same
        this.entity.dbase.name === this.ref.dbname
            //
            //...entity and the current one are the same
            && this.entity.name === this.ref.ename);
    }
}
//Its instance contains all (inputable) the columns of type attribute 
export class attribute extends column {
    //
    //The column must have a name, a parent column and the data the json
    // data input 
    constructor(parent, static_column) {
        //
        //The parent constructor
        super(parent, static_column);
    }
}
