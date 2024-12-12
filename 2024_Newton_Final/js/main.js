(function(){
   //pseudo-global variables
   var attrArray = ["Infant Center", "Infant Home", "Toddler Center", "Toddler Home","Pre School Center","Pre School Home", "School Age Center", "School Age Home"]; //list of attributes
   var expressed = attrArray[3]; //initial attribute
   var domainArray = [];
   //console.log(expressed)
   
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
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
    .domain([0, 100]);

//begin script when window loads
window.onload = setMap();

function setMap() {
    // Zoom ability added, defines zoom behavior
    var zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    var width = window.innerWidth * .5, height = 473;

    //create new svg container for the map
    var svg = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    // Create a group element to hold the map graphics
    var g = svg.append("g");

    var projection = d3.geoAzimuthalEqualArea()
        .center([-5, 37.5])
        .rotate([90, 0, 0])
        .scale(900)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/ChildcarePrices2018.csv"));
    promises.push(d3.csv("data/ChildcarePrices2023.csv"));
    promises.push(d3.json("data/Counties.topojson"));
    promises.push(d3.json("data/Countries.topojson")); //load background spatial data 
    Promise.all(promises).then(callback);

    function callback(data) {
        var csv2018Data = data[0],
            csv2023Data = data[1],
            Counties = data[2],
            Countries = data[3];

        var usCounties = topojson.feature(Counties, Counties.objects.Counties).features;
        var CountriesTopo = topojson.feature(Countries, Countries.objects.Countries);

        //place graticule on the map
        setGraticule(g, path);

        //add countries to map
        var countries = g.append("path")
            .datum(CountriesTopo)
            .attr("class", "countries")
            .attr("d", path);

        //join csv data to GeoJSON enumeration units
        var counties = joinData(usCounties, csv2018Data);

        //create the color scale
        var colorScale = makeColorScale(csv2023Data);

        //add enumeration units to the map
        setEnumerationUnits(counties, g, path, colorScale, svg, zoom, width, height);

        //add coordinated visualization
        setChart(csv2023Data, colorScale);

        createDropdown(csv2023Data);
    };

    //added in zooming capability on the map
    function zoomed(event) {
        const { transform } = event;
        g.attr("transform", transform);
        g.attr("stroke-width", 1 / transform.k);
    };



    //Add the home button
    addHomeButton(svg, zoom);    
}

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
    buttonGroup.on("click", function() {
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
        );
    });
}

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
};

function joinData(counties,csv){
                
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csv.length; i++){ //csv.length
        var csvCounty = csv[i]; //the current region
        //console.log(csvCounty)
        var csvKey = csvCounty.FIPS; //the CSV primary key
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
};

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
            clicked(event, d, map, path, zoom, width, height);
        });
}

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#f2f0f7",
        "#cbc9e2",
        "#9e9ac8",
        "#756bb1",
        "#54278f"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    //build array of all values of the expressed attribute

    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
        //console.log(val)
    };
    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
    //console.log(colorScale)
    return colorScale;

};

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
};
//function to create a dropdown menu for attribute selection
function createDropdown(csv){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csv)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var newAttrArray = attrArray.slice(3)
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(newAttrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d.replace(/_/g, " ") });
};
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
};

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
};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    //console.log(props)
    var selected = d3.selectAll("." + props.FIPS2)
        .style("stroke", "yellow")
        .style("stroke-width", "2");
    setLabel(props)
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.FIPS2)
        .style("stroke", "black")
        .style("stroke-width", 0);
};
//function to create dynamic label
function setLabel(props){
    //label content
    //console.log(props)
    var labelAttribute = "<h1>" + props[expressed] +
        "%</h1><b>" + "of Median Income" + "</b><br>" + props.county +", " + props.STATE + "</br>"

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.FIPS2 + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};

//Example 2.8 line 1...function to move info label with mouse
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
};
//I am here for reworking my Lab 2 as the basis!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Function to handle clicking on a county
function clicked(event, d, map, path, zoom, width, height) {
    console.log("clicked event triggered");
    event.stopPropagation();
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    map.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, map.node())
    );
}
})();