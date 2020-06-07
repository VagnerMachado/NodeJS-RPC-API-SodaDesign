/*
=-=-=-=-=-=-=-=-=-=-=-=-
Soda Designer
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID: 23651127
Comment (Required):

This file handles all aspects for the soda design API. When the file is executed,
it uses the third party npm package JIMP load images into 
memory before the server is started. After that, the server is started and and receives as 
input arguments an array of Jimp images for the can and an array of Jimp images with fruit 
flavors. There is also a crab cola flavor if the user wanna take fun to another level :)
The server listens to port 3000 and root access causes it to serve the index.html page with a 
form where users can choose a color for the can and the flavor for the soda. Clicking submit in 
this form, sends the data for the color and the flavor to the /design directory in the web API. 
There, the input is processed and a filename is created. Case the filename, created using the 
flavor and RGB values for the can, is already in cache, that cached can is delivered. 
Case the can is not in cache, we use JIMP to clone and  grayscale the body of the can.
Then we use JIPM to layer images in this order: can lid, can body, can sticker, flavor and then  write
the image to cache directory. Finally, we proceed to deliver the can to the user by opening a readstream 
and piping that .png image to the remote socket for response. Errors are caught during parsing, i.e injecting
into the URL a non existing flavor causes a 404 error while injecting a non existing color 
causes white to be delivered as can color. A catch all error page is provided so any indesired
traffic to non existing or non authorized directories are routed to a 404 error page. 
The image delivered to user can be dragged right clicked and 
saved onto the useer's system. 


=-=-=-=-=-=-=-=-=-=-=-=-
*/
//I declare the server later, after images are loaded ot memory
var Jimp = require('jimp');
const fs = require('fs');


// EXAMPLE, LEFT HERE FOR REFERENCE
/*
jimp.read('assets/flavor/orange.png', (err, image) => {
    if (err) {
        throw err;
    }
    image
        .resize(128, 128)   // resize
        .greyscale()        // set greyscale
        .color([
            {apply: "red", params: [0]},
            {apply: "green", params: [0]},
            {apply: "blue", params: [128]}  //applies blue coloring to greyscale img
        ])
        .write('blorange.png', () => console.log("File Saved!") );
});
*/

/**
 * open_assets: reads the resources into two Jimp array of images and passes them as parameters
 * to be utilized by the API server. Each reasource is read by Jimp and augumented by creating a
 * field 'resource' that contains the data returned by each jimp read.
 */
let open_assets = function () 
{
    //resources for the can 
    const can =
    {
        lid: { path: "assets/can/can-lid.png" },
        body: { path: "assets/can/can-body.png" },
        label: { path: "assets/can/can-label.png" }
    };

    //resources for the flavors
    const flavors =
        [
            { id: "apple", path: "assets/flavor/apple.png", x: 120, y: 265 },
            { id: "banana", path: "assets/flavor/banana.png", x: 80, y: 285 },
            { id: "cherry", path: "assets/flavor/cherry.png", x: 100, y: 250 },
            { id: "coconut", path: "assets/flavor/coconut.png", x: 110, y: 270 },
            { id: "crab", path: "assets/flavor/crab.png", x: 83, y: 305 },
            { id: "grape", path: "assets/flavor/grape.png", x: 93, y: 268 },
            { id: "mango", path: "assets/flavor/mango.png", x: 100, y: 295 },
            { id: "orange", path: "assets/flavor/orange.png", x: 90, y: 265 },
            { id: "watermelon", path: "assets/flavor/watermelon.png", x: 75, y: 280 }
        ];

    //counter for the loaded images
    let imageCounter = 0;
    
    //read each can resource using jimp and augument the array. Provide printout of the loaded resources
    for (let property in can) {
        let path = can[property].path;
        Jimp.read(path, (err, image) => {
            if (err) {
                console.log("Error loading image located in ", path)
            }
            else {
                can[property].resource = image;
                console.log("Loaded -> property:", property, ", path:", path, ", resource mime: ", image._originalMime);
                imageCounter++;
            }
        });
    }
    //trigger for the server initialization
    let target = Number(flavors.length) + 3;

    //read each flavor resource using jimp and augument the array. Provide printout of the loaded resources
    for (let item in flavors) 
    {
        let path = flavors[item].path;
        Jimp.read(path, (err, image) => 
        {
            if (err) 
            {
                console.log("Error loading image located in ", path)
            }
            else
            {
                flavors[item].resource = image;
                console.log("Loaded -> id:", flavors[item].id, ", path:", path, ", resource mime: ", image._originalMime);

                //when all images re loaded, start a server and pass both can and flavor arrays as parameters
                if (++imageCounter == target) 
                {
                    start_server(can, flavors);
                }
            }
        });
    }
}
/**
 * @param {a color in hexadecimal} hex
 * convers the hexadecimal color into rgb. 
 */
const hexToRgb = function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return (
        result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            }
            : { r: 255, g: 255, b: 255 }
    );
};

/**
 * deliver-can: deliver the API created can to the user
 * by piping it.
 * @param {the name for the soda can file } filename 
 * @param {the response beind handled} res 
 */
let deliver_can = (filename, res) =>
{
    let data = fs.createReadStream(filename);
    res.writeHead(200, { "Content-Type": "image/png" });
    data.pipe(res);
}

/**
 * create_can: creates a can with the input produced
 * by the user. Uses Jimp to color, layer the 
 * images and save it to specific filename. 
 * Finally, calls deliver can to deliver it to user. 
 * 
 * @param {an array of can image resources} can 
 * @param {a color to paint the can} color 
 * @param {a flavor to place on the} flavor 
 * @param {a filename to save the created can} filename 
 * @param {the response being handled} res 
 */
let create_can  =  function (can, color, flavor , filename, res)
{
    //clone body and color it
    let new_can = can.body.resource.clone();
    let colored_can = new_can.color([
        {apply: "red", params: [color.r]},
        {apply: "green", params: [color.g]},
        {apply: "blue", params: [color.b]}
    ]);
    //layer the images from bottom to top
    can.lid.resource
    .blit(colored_can,0,0)
    .blit(can.label.resource, 40, 210)
    .blit(flavor.resource,flavor.x,flavor.y)
    .write(filename, () =>   //write to file
    {
        console.log("New soda can saved to cache: ", filename);
        deliver_can(filename,res);
        console.log("Delivering the new soda can.");
    });
   
}

/**
 *  This method starts the API server to listen to port 3000. It listens for error, listening and request
 * events. Request events fall under these categories:
 *      # root: servers a form to be filled by user.
 *      # favicon: serves a favicon
 *      # image credits: serves plain text with image credits
 *      # 404.png: serves a image for error page
 *      # design: serves a cached soda can case it exists, else designs, caches and serves a newly created soda can.
 *      # all others: serves an error page
 * @param {an array of can image resources} can 
 * @param {an array of flavor resources} flavors 
 */
let start_server = function (can, flavors) {
    //required added here so servers items start after images are loaded.
    const http = require('http'); 
    const url = require('url');

    //create an http server
    const server = http.createServer();
    const port = 3000;

    //server listeners for listening and error and request 
    server.on("listening", listening_handler);
    server.on("error", (err) => { console.log("\n**SERVER ERROR**\n", err.message) });
    server.on("request", connection_handler);

    //Initialize the listening process on port 3000
    server.listen(port);

    /**
     * listening_handler: prints the listening port
     */
    
    function listening_handler() 
    {
        console.log(`Now Listening on Port ${port}`);
    }

    /**
     * connection_handler:  handles connection into the API and serves these 
     * responses to the user:
     *      # root: servers a form to be filled by user.
     *      # favicon: serves a favicon
     *      # image credits: serves plain text with image credits
     *      # 404.png: serves an image for error page
     *      # design: serves a cached soda can case it exists, else it designs, caches and serves a newly created soda can.
     *      # all others: serves an error page
     * @param {the request sent by user of API} req 
     * @param {the response to the user of API } res 
     */
    function connection_handler(req, res) 
    {
        console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);

        //request for the homepage: respond with homepage html file	with form
        if (req.url === "/") 
        {
            const form = fs.createReadStream('html/form.html');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            form.pipe(res);
        }

        //request for the favicon for the page: respond with favicon for the page
        else if (req.url === "/images/favicon.ico") 
        {

            const icon = fs.createReadStream("images/favicon.ico");
            res.writeHead(200, { "Content-Type": "image/x-icon" });
            icon.pipe(res);
        }

        /**
         * design: serves a cached can if it exists otherwise, if paramters are valid, it creates,
         * caches and delivers an newly customized soda can
         */
        else if (req.url.startsWith("/design")) 
        {
            //parses and validates user input
            let user_input = url.parse(req.url, true).query;
            let color = user_input.color;
            let flavor = user_input.flavor;

            //if user input is not undefined
            if (color !== undefined && flavor !== undefined) 
            {
                //parese the color and hex to rgb it. If color is invalid, background is white as default
                color = hexToRgb(color);
                let r = color.r;
                let g = color.g;
                let b = color.b;

                //finds the resource for flavor input
                let i = flavors.findIndex(flavor => flavor.id === user_input.flavor)

                //case user passed an invaled flavor, serve error page 
                if (i < 0) {
                    res.writeHead(404, { "Content-Type": "text/html" });
                    res.end("<h1 style='text-align: center; padding: 10px; '>Hey! We Cannot Taste That Flavor..</h1>" +
                        "<img style='display: block; border: 5px solid black; margin-left: auto; " +
                        "margin-right: auto; ' height= 400 width=600 src=images/404.jpg />" +
                        "<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>");
                    res.end();
                }

                //for valid input, build filename and check cache. If soda can exists, deliver it, else create can.
                else
                {
                    //build filename with user input
                    let filename = `./tmp/${flavors[i].id}-${color.r}-${color.g}-${color.b}.png`;
                    //checking cache
                    if(fs.existsSync(filename))
                    {
                        console.log("Delivering cached soda can");
                        deliver_can(filename,res); //delivers cached data if it exists
                    }

                    //otherwise create a soda can with user input
                    else
                    {
                        console.log("Can requested not in cache, creating new soda can")
                        create_can(can, color, flavors[i], filename, res);
                    }
                }
            }
            //else input is undefined an error page is served
            else {
                res.writeHead(404, { "Content-Type": "text/html" });
                res.end("<h1 style='text-align: center; padding: 10px; '>Invalid API Query </h1>" +
                    "<img style='display: block; border: 5px solid black; margin-left: auto; " +
                    "margin-right: auto; ' height= 400 width=600 src=images/404.jpg />" +
                    "<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>");
            }
        }
        //request the credits for the images used. Plain text file is served
        else if (req.url === "/image-credits.txt") {
            const credit = fs.createReadStream('assets/image-credits.txt');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            credit.pipe(res);
            credit.on('end', () => { res.end(); });
        }
        //serves the image resource for tag in error page
        else if (req.url === "/images/404.jpg") {

            const boohoo = fs.createReadStream("images/404.jpg");
            res.writeHead(200, { "Content-Type": "image/x-icon" });
            boohoo.on("end", () => { res.end() });
            boohoo.pipe(res);
        }
        //catch all: serves error html and .jpg resource path to invalid directories
        else {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("<h1 style='text-align: center; padding: 10px; '>Invalid Directory </h1>" +
                "<img style='display: block; border: 5px solid black; margin-left: auto; " +
                "margin-right: auto; ' height= 400 width=600 src=images/404.jpg />" +
                "<a href='http://localhost:3000'><p style='text-align:center;'>HOMEPAGE</p></a>");
        }
    }
}

/**
 * open_assests: the call that starts loading images assets into memory, which triggers the initialization 
 * of the API server and capability to receive input, process it and produce the proper response. 
 */

open_assets();
