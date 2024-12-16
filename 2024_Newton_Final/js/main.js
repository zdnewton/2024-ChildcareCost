(function(){

//pseudo-global variables
var attrArray = ["Infant Center", "Infant Home", "Toddler Center", "Toddler Home","PreSchool Center","PreSchool Home", "School Age Center", "School Age Home"]; //list of attributes
var expressed = attrArray[0]; //initial attribute
var domainArray = [];
//console.log(expressed)

//chart frame dimensions
var chartWidth = window.innerWidth * 0.45,
chartHeight = 473,
leftPadding = 25,
rightPadding = 2,
topBottomPadding = 5,
chartInnerWidth = chartWidth - leftPadding - rightPadding,
chartInnerHeight = chartHeight - topBottomPadding * 2,
translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
               .range([463, 0])
               .domain([0, 40]);

//begin script when window loads
window.onload = setMap();

function setMap() {
    // Initialize zoom behavior
    var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

    var width = window.innerWidth * .5, height = 460;

    //create new svg container for the map
    var svg = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    // Create a group element to hold the map graphics
    var g = svg.append("g");        

    // Create custom conic equal area projection focused on the contiguous USA
    var projection = d3.geoConicEqualArea()
        .parallels([29.5, 45.5]) 
        .scale(1000) 
        .translate([480, 250]) 
        .rotate([96, 0]) 
        .center([0, 37.5]); 

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/ChildcarePrices2018.csv"));
    promises.push(d3.csv("data/ChildcarePrices2023.csv"));
    promises.push(d3.json("data/Counties.topojson"));
    promises.push(d3.json("data/Countries.topojson")); //load background spatial data
    promises.push(d3.json("data/States.topojson"));
    Promise.all(promises).then(callback);

    function callback(data) {
        var csv2018Data = data[0],
            csv2023Data = data[1],
            Counties = data[2],
            Countries = data[3],
            States = data[4];
    
        var usCounties = topojson.feature(Counties, Counties.objects.Counties).features;
        var CountriesTopo = topojson.feature(Countries, Countries.objects.Countries);
        var StatesTopo = topojson.feature(States, States.objects.States);
    
        // Place graticule on the map
        setGraticule(g, path);
    
        // Add countries to map
        var countries = g.append("path")
            .datum(CountriesTopo)
            .attr("class", "countries")
            .attr("d", path);
    
        // Join CSV data to GeoJSON enumeration units
        var counties = joinData(usCounties, csv2023Data);
    
        // Create the color scale
        var colorScale = makeColorScale(csv2023Data);
    
        // Add enumeration units to the map
        setEnumerationUnits(counties, g, path, colorScale, svg, zoom, width, height);
    
        var states = g.append("path")
            .datum(StatesTopo)
            .attr("class", "States")
            .attr("d", path);
    
        // Add coordinated visualization
        setChart(csv2023Data, colorScale);
    
        createDropdown(svg, csv2023Data);
    };

    // Zoom function
    function zoomed(event) {
        const { transform } = event;
        currentTransform = transform; // Update currentTransform with the new transform
        g.attr("transform", currentTransform);
        g.attr("stroke-width", 1 / currentTransform.k);
        //console.log("Current transform during zoom:", currentTransform);
    }

    //Add the home button
    addHomeButton(svg, zoom);
    //Add 2018 Year Button
    add2018Button(svg);
    //Add 2023 Year Button
    add2023Button(svg);    

    addFlipSwitch(svg);
}; // End of setMap function

function addHomeButton(svg, zoom) {
    // Create a group for the button
    var buttonGroup = svg.append("g")
        .attr("class", "home-button")
        .attr("transform", "translate(10, 10)");

    // Create a rectangle for the button background
    buttonGroup.append("rect")
        .attr("width", 50)
        .attr("height", 30);

    // Add text to the button
    buttonGroup.append("text")
        .attr("x", 25)
        .attr("y", 20)
        .text("Home");

    // Add click event to reset zoom and pan
    buttonGroup.on("click", function(event) {
        event.stopPropagation(); // Prevent click propagation
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
        );
    });

    // Prevent click propagation for other events
    buttonGroup.on("mousedown", function(event) { event.stopPropagation(); });
    buttonGroup.on("mouseup", function(event) { event.stopPropagation(); });
    buttonGroup.on("dblclick", function(event) { event.stopPropagation(); });
}

function add2018Button(svg) {
    // Create a group for the button
    var buttonGroup = svg.append("g")
        .attr("class", "Y2018-button")
        .attr("transform", "translate(10, 50)");

    // Create a rectangle for the button background
    buttonGroup.append("rect")
        .attr("width", 50)
        .attr("height", 30);

    // Add text to the button
    buttonGroup.append("text")
        .attr("x", 25)
        .attr("y", 20)
        .text("2018");

    // Add click event to switch data to 2018
    buttonGroup.on("click", function(event) {
        event.stopPropagation(); // Prevent click propagation
        // Your code to switch data to 2018
    });

    // Prevent click propagation for other events
    buttonGroup.on("mousedown", function(event) { event.stopPropagation(); });
    buttonGroup.on("mouseup", function(event) { event.stopPropagation(); });
    buttonGroup.on("dblclick", function(event) { event.stopPropagation(); });
}

function add2023Button(svg) {
    // Create a group for the button
    var buttonGroup = svg.append("g")
        .attr("class", "Y2023-button")
        .attr("transform", "translate(10, 90)");

    // Create a rectangle for the button background
    buttonGroup.append("rect")
        .attr("width", 50)
        .attr("height", 30);

    // Add text to the button
    buttonGroup.append("text")
        .attr("x", 25)
        .attr("y", 20)
        .text("2023");

    // Add click event to switch data to 2023
    buttonGroup.on("click", function(event) {
        event.stopPropagation(); // Prevent click propagation
        // Your code to switch data to 2023
    });

    // Prevent click propagation when interacting with map
    buttonGroup.on("mousedown", function(event) { event.stopPropagation(); });
    buttonGroup.on("mouseup", function(event) { event.stopPropagation(); });
    buttonGroup.on("dblclick", function(event) { event.stopPropagation(); });
}

// What are your thoughts on doing this instead, a little more fun
function addFlipSwitch(svg) {
    // Create a group for the flip switch
    var switchGroup = svg.append("g")
        .attr("class", "flip-switch")
        .attr("transform", `translate(${svg.attr("width") - 70}, ${svg.attr("height") - 40})`);

    // Create the flip switch input
    switchGroup.append("foreignObject")
        .attr("width", 60)
        .attr("height", 30)
        .append("xhtml:div")
        .html(`
            <input class="tgl tgl-flip" id="cb5" type="checkbox"/>
            <label class="tgl-btn" data-tg-off="2018" data-tg-on="2023" for="cb5"></label>
        `);
} // end of addFlipSwitch function

function setGraticule(map, path){
    //create graticule generator
    var graticule = d3.geoGraticule()
    .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
    .datum(graticule.outline()) //bind graticule background
    .attr("class", "gratBackground") //assign class for styling
    .attr("d", path) //project graticule

    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
    .data(graticule.lines()) //bind graticule lines to each element to be created
    .enter() //create an element for each datum
    .append("path") //append each element to the svg as a path element
    .attr("class", "gratLines") //assign class for styling
    .attr("d", path); //project graticule lines
}; //End of setGraticule function

function joinData(counties,csv){
                
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csv.length; i++){ //csv.length
        var csvCounty = csv[i]; //the current region
        var csvKey = csvCounty.FIPS2; //the CSV primary key
        //console.log(csvKey)
        //loop through geojson regions to find correct region
        for (var a=0; a<counties.length; a++){
            //console.log(counties.length)
            var geojsonProps = counties[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.FIPS2; //the geojson primary key
            
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //console.log(geojsonKey)
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    //console.log(parseFloat(csvCounty[attr]));
                    var val =  parseFloat(csvCounty[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    
                });
            };
            //console.log(geojsonProps)
        };
    }
    return counties;
}; //End of joinData function

function setEnumerationUnits(usCounties, map, path, colorScale, svg, zoom, width, height) {
    //add us counties to map
    var usCounties = map.selectAll(".FIPS2")
        .data(usCounties)
        .enter()
        .append("path")
        .attr("class", function(d) {
            return "county " + d.properties.FIPS2;
        })
        .attr("d", path)
        .style("fill", function(d) {            
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]);            
            } else {                
                return "#ccc";            
            }
        })             
        .on("mouseover", function(event, d) {
            highlight(d.properties);
        })
        .on("mouseout", function(event, d) {
            d3.select(".infolabel").remove();
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel)
        .on("click", function(event, d) {
            clicked(event, d, svg, path, zoom, width, height);
        });
}; //End of setEnumerationUnits function

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#f1eef6",
        "#d7b5d8",
        "#df65b0",
        "#dd1c77",
        "#980043"
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
    .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
    var val = parseFloat(data[i][expressed]);
    
    //removes 0 or no data values before calculating the breaks
    if (val == 0){
    } else {
        domainArray.push(val);
    }
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
    return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
    return colorScale;

}; //End of makeColorScale function

//function to create coordinated bar chart
function setChart(csv, colorScale){
   
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csv)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.FIPS2;
        })
        .attr("width", (chartInnerWidth / csv.length))
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csv.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        })
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function(event, d){
            d3.select(".infolabel")
            .remove();
            dehighlight(d);
        })
        .on("mousemove", moveLabel); 

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text(expressed.replace(/_/g, " "));

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
}; //End of setChart function

function createDropdown(svg, csv) {
    var margin = 10;
    // Create a group for the dropdown and text box
    var containerGroup = svg.append("g")
        .attr("class", "dropdown-container")
        .attr("transform", "translate(" + margin + ", " + (svg.attr("height") - margin - 60) + ")");

    // Add a rectangle as the background
    var backgroundRect = containerGroup.append("rect")
        .attr("class", "dropdown-background")
        .attr("width", 200) //  width
        .attr("height", 80) // Adjust height as needed
        .attr("rx", 10) // Rounded corners
        .attr("ry", 10);

    // Controls the dropdown menu
    var dropdown = containerGroup.append("foreignObject")
        .attr("width", 200)
        .attr("height", 40)
        .attr("x", 10)
        .attr("y", 10)
        .append("xhtml:select")
        .attr("class", "dropdown")
        .on("change", function() {
            changeAttribute(this.value, csv);
            updateDescription(this.value);
        });

    // Add initial option
    dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    // Add attribute name options
    dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d) { return d; })
        .text(function(d) { return d.replace(/_/g, " "); });

    // Text box for the description
    var description = containerGroup.append("foreignObject")
        .attr("width", 225)
        .attr("height", 30)
        .attr("x", 220) // Position to the right of the dropdown
        .attr("y", 10)
        .attr("class", "attribute-description hidden") // Initially hidden
        .append("xhtml:div")
        .style("color", "#333")
        .text("Select an attribute to see the description.");

    // The information box expand button
    var expandButtonContainer = containerGroup.append("foreignObject")
        .attr("class", "expand-button-container")
        .attr("width", 15)
        .attr("height", 60)
        .attr("x", 215) // Button lined up to edge of rectangle
        .attr("y", 0) // Center vertically within the container
        .append("xhtml:button")
        .attr("class", "expand-button")
        .style("background-color", "#EA4C89")
        .style("cursor", "pointer")
        .style("color", "#fff")
        .style("font-size", "12px")
        .style("text-align", "left")
        .text(">")
        .on("click", function() {
            var container = d3.select(".dropdown-container");
            var isExpanded = container.classed("expanded");
            container.classed("expanded", !isExpanded);
            d3.select(this).text(isExpanded ? ">" : "<");
        
            // Update button position and container width based on expanded state
            var newX = isExpanded ? 215 : 590;
            var newWidth = isExpanded ? 200 : 800; // Adjust container width
            d3.select(this.parentNode)
              .transition()
              .duration(1000)
              .ease(d3.easeLinear)
              .attr("x", newX);
            d3.select(".dropdown-background")
              .transition()
              .duration(1000)
              .ease(d3.easeLinear)
              .attr("width", newWidth);
        
            // Show or hide the attribute description with a delay
            if (isExpanded) {
                d3.select(".attribute-description")
                  .attr("transition-style", "out:wipe:left"); // Add transition style for wipe-out
                setTimeout(function() {
                    d3.select(".attribute-description")
                      .classed("hidden", true);
                }, 2500); // Delay to match the animation duration (2.5s)
            } else {
                d3.select(".attribute-description")
                  .classed("hidden", false)
                  .attr("transition-style", "in:wipe:right"); // Add transition style for wipe-in
            }
        });
}

function updateDescription(attribute) {
    var descriptions = {
        "Infant Center": "The percentage of household income spent on center-based care for infants.\nThis includes costs for daycare centers or similar facilities that provide care for infants.",
        "Infant Home": "The percentage of household income spent on home-based care for infants.\nThis includes costs for nannies, babysitters, or family members providing care at home.",
        "Toddler Center": "The percentage of household income spent on center-based care for toddlers.\nThis includes costs for daycare centers or similar facilities that provide care for toddlers.",
        "Toddler Home": "The percentage of household income spent on home-based care for toddlers.\nThis includes costs for nannies, babysitters, or family members providing care at home.",
        "PreSchool Center": "The percentage of household income spent on center-based care for preschool-aged children.\nThis includes costs for preschools or similar facilities that provide care and early education for preschoolers.",
        "PreSchool Home": "The percentage of household income spent on home-based care for preschool-aged children.\nThis includes costs for nannies, babysitters, or family members providing care at home.",
        "School Age Center": "The percentage of household income spent on center-based care for school-aged children.\nThis includes costs for after-school programs, daycare centers, or similar facilities that provide care for school-aged children.",
        "School Age Home": "The percentage of household income spent on home-based care for school-aged children.\nThis includes costs for nannies, babysitters, or family members providing care at home."
    };

    d3.select(".attribute-description")
        .text(descriptions[attribute] || "No description available.");
}

function changeAttribute(attribute, csv) {
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csv);

    //recolor enumeration units
    var county = d3.selectAll(".county")
    .transition()
    .duration(1000)
    .style("fill", function (d) {
        var value = d.properties[expressed];
        if (value) {
            return colorScale(d.properties[expressed]);
        } else {
            return "#ccc";
        }
    });
    //Sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
    //Sort bars
    .sort(function(a, b){
        return b[expressed] - a[expressed];
    })
    .transition()
    .delay(function(d,i){
        return i
    })
    .duration(500)
    .attr("x", function(d, i){
        return i * (chartInnerWidth / csv.length) + leftPadding;
    })
    //resize bars
    .attr("height", function(d, i){
        return 463 - yScale(parseFloat(d[expressed]));
    })
    .attr("y", function(d, i){
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
    })
    //recolor bars
    .style("fill", function(d){            
        var value = d[expressed];            
        if(value) {                
            return colorScale(value);            
        } else {                
            return "#ccc";            
        }    
    });
    updateChart(bars, csv.length, colorScale);
}; //End of changeAttribute function

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
        return i * (chartInnerWidth / n) + leftPadding;
    })
    //size/resize bars
    .attr("height", function(d, i){
        return 463 - yScale(parseFloat(d[expressed]));
    })
    .attr("y", function(d, i){
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
    })
    //color/recolor bars
    .style("fill", function(d){            
        var value = d[expressed];            
        if(value) {                
            return colorScale(value);            
        } else {                
            return "#ccc";            
        }    
    });
    var chartTitle = d3.select(".chartTitle")
    .text(expressed.replace(/_/g, " "));
}; //End of updateChart function

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.FIPS2)
        .style("stroke", "yellow")
        .style("stroke-width", "2");
    setLabel(props)
    //console.log(props)
}; //End of highlight function

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.FIPS2)
        .style("stroke", "black")
        .style("stroke-width", 0);
}; //End of dehighlight function

//function to create dynamic label
function setLabel(props){
    //label content
    //console.log(props)
    if ((props[expressed]) == 0) {
        var labelAttribute ="No Data"
    } else {
    var labelAttribute = "<b>" + props[expressed] +
        "%</b> of Median Income" + "<br>" + props.county +", " + props.STATE + "</br>"
    };
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.FIPS2 + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
}; //End of setlabel function

function moveLabel(event){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
}; //End of moveLabel function

// This function runs to zoom in on the county clicked on.
function clicked(event, d, svg, path, zoom, width, height) {
    console.log("clicked event triggered");
    event.stopPropagation();
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, svg.node())
    );
    console.log("clicked finished running");
}; //End of clicked function

})();