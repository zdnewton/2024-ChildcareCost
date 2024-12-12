(function() {
    
    // Pseudo-global variables allows functions to call variables across the scope
    var attrArray = ["Median Income Per Household", "Mean Income Per Household", "Population", "GDP in Thousands of Chained Dollars", "Average Monthly Unemployment"];
    //console.log("attrArray: ", attrArray);

    var expressed = attrArray[0]; //Initial expressed attribute
    //console.log("expressed attribute: ", expressed);

    var chartInnerWidth, chartInnerHeight; //instantiating variables to bridge use between functions

    // Chart frame dimensions
    var chartWidth = 550;
    var chartHeight = 460;
    var leftPadding = 50;
    var rightPadding = 2;
    var topBottomPadding = 5;
    var chartInnerWidth = chartWidth - leftPadding - rightPadding;
    var chartInnerHeight = chartHeight - topBottomPadding * 2;
    var translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


    // Begin script when window loads
    window.onload = setMap;

    //function to build the map element with svg generators
    function setMap() {
        console.log("Running setMap");
    
        // Zoom ability added, defines zoom behavior
        var zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);
    
        // Map frame dimensions
        var width = 700,
            height = 800;
    
        //svg generator
        var svg = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
            .call(zoom);
    
        var map = svg.append("g");
    
        // Create custom conic equal area projection
        var projection = d3.geoConicEqualArea()
            .parallels([33, 45])
            .scale(4200)
            .translate([-300, 630])
            .rotate([120, 0])
            .center([-10, 34]);
    
        // Create a path generator using the projection
        var path = d3.geoPath().projection(projection);
    
        // Use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/Cali_County_Data.csv")); // Load attributes from CSV
        promises.push(d3.json("data/Surrounding_Cali_States_Provinces.topojson")); // Load surrounding states spatial data
        promises.push(d3.json("data/California_Counties.topojson")); // Load California counties spatial data
        Promise.all(promises).then(callback).catch(function(error) {
            console.error("Error loading data: ", error);
        });
    
        //function to implement the loaded data
        function callback(data) { 
            console.log("Running callBack");
            var csvData = data[0],
                caliCounties = data[2],
                surrounding = data[1];
    
            //debugging to see things created succesfully
            console.log("csvData: ", csvData);
            console.log("California Counties topojson: ", caliCounties);
            console.log("Surrounding States topojson: ", surrounding);
    
            // Translate TopoJSONs back to GeoJSON
            var californiaCounties = topojson.feature(caliCounties, caliCounties.objects.California_Counties).features;
            console.log("Converted GeoJSON features: ", californiaCounties);
            var surroundingStates = topojson.feature(surrounding, surrounding.objects.Surrounding_Cali_States_Provinces).features;
    
            // Call functions with the loaded data
            joinData(californiaCounties, csvData);
            setGraticule(map, path, surroundingStates, svg, zoom, width, height);
            var colorScale = makeColorScale(csvData);
            setEnumerationUnits(californiaCounties, map, path, colorScale, svg, zoom, width, height);
    
            //calls the function to create the chart
            setChart(csvData, colorScale, expressed);
    
            //calls function to create the dropdwon
            createDropdown(csvData);
        };
    
        //added in zooming capability on the map
        function zoomed(event) {
            const { transform } = event;
            map.attr("transform", transform);
            map.attr("stroke-width", 1 / transform.k);
        };
    
        svg.on("click", function(event) {
            console.log("reset event triggered");
            event.stopPropagation(); // Prevent event propagation
            if (!event.target.classList.contains('county')) {
                console.log("reset check passed");
                reset(map, svg, zoom, width, height); // Pass the necessary parameters here
            } else {
                console.log("reset check failed");
            }
        });

        //adds the funcionality that the zoom and translation reset when you click anywhere outside of the counties
        function reset(map, svg, zoom) {
            console.log("Running reset function");
            map.selectAll(".counties").transition();
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
            );
        };
    };
    
    //joins CSV data to the topojson.
    function joinData(californiaCounties, csvData) {
        console.log("Running joinData");
        //loops through each county to add the data to the shape
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; // The current county
            var csvKey = csvRegion.California_County; // The CSV primary key
    
            for (var a = 0; a < californiaCounties.length; a++) {
                var geojsonProps = californiaCounties[a].properties; // The current county geojson properties
                var geojsonKey = geojsonProps.California_County; // The geojson primary key
    
                // Where primary keys match, transfer CSV data to geojson properties object
                if (geojsonKey == csvKey) {
                    // Assign all attributes and values
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvRegion[attr]); // Get CSV attribute value
                        geojsonProps[attr] = val; // Assign attribute and value to geojson properties
                    });
                }
            }
        }
    };
    
    //function to create the graticule visible over the "ocean" but not over the counties or surrounding states
    function setGraticule(map, path, surroundingStates, svg, zoom, width, height) {
        console.log("Running setGraticule");
        // Create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); // Place graticule lines every 5 degrees of longitude and latitude
    
        // Create background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) // Bind graticule background
            .attr("class", "gratBackground") // Assign class for styling
            .attr("d", path); // Project graticule
    
        // Create graticule lines, a little confrusing wihtout labels, next time...
        var gratLines = map.selectAll(".gratLines") // Select graticule elements that will be created
            .data(graticule.lines()) // Bind graticule lines to each element to be created
            .enter() // Create an element for each datum
            .append("path") // Append each element to the SVG as a path element
            .attr("class", "gratLines") // Assign class for styling
            .attr("d", path); // Project graticule lines


        // putting states after gratlines made the states display over the gratLines
        var states = map.selectAll(".states")
            .data(surroundingStates)
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "states " + d.properties.name; // Name of the name field is "name"
            })
            .attr("d", path);
    }

    // Function to create color scale generator
    function makeColorScale(data){
        console.log("Running makeColorScale")
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        // Create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        // Build array of all values of the expressed attribute
        var domainArray = [];
        //console.log("expressed value at domainArray creation: ", expressed);
        //console.log("data from within the colorScale function: ", data);
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            //console.log("val: ", val);
            domainArray.push(val);
        };
        console.log("domainArray", domainArray);

        // Cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        // Re-set domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        // Remove first value from domain array to create class breakpoints
        domainArray.shift();

        // Assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;        
    };

    function setEnumerationUnits(californiaCounties, map, path, colorScale, svg, zoom, width, height) {
        console.log("Running setEnumerationUnits");
        // Add California counties to map
        var counties = map.selectAll(".counties")
            .data(californiaCounties) // Pass in the reconverted GeoJSON
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "counties " + d.properties.California_County.replace(/\s+/g, '_');
            })
            .attr("d", path)
            .style("fill", function(d) {
                var value = d.properties[expressed];
                return value ? colorScale(d.properties[expressed]) : "#ccc";
            })
            .on("mouseover", function(event, d) {
                console.log("mouseover triggered");
                highlight(d.properties);
            })
            .on("mouseout", function(event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel)
            .on("click", function(event, d) {
                clicked(event, d, svg, path, zoom, width, height); // Pass the width and height variables here
            });
    };

    // Function to create coordinated bar chart
    function setChart(csvData, colorScale, expressed) {
        console.log("Running setChart");
    
        // Create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        // Create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)  // Match chartBackground height to chartInnerHeight
            .attr("transform", translate);
    
        // Create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])  // Adjusted range to match inner height
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed]); })]);
    
        // Set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b) {
                return a[expressed] - b[expressed]; //sort the bars by the expressed value
            })
            .attr("class", function(d) {
                return "bar " + d.California_County.replace(/\s+/g, '_'); //regex operator guarantees matching county names
            })
            .attr("width", chartInnerWidth / csvData.length - 1) // - 1 leaves slight space between bars
            .attr("x", function(d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));  // Adjusted height calculation
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed])) + 5;  // Adjusted y position needed to not overlap frame
            })
            .style("fill", function(d) {
                return colorScale(d[expressed]); //color coded to match counties
            })
            .on("mouseover", function(event, d) {
                highlight(d);
            })
            .on("mouseout", function(event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
    
        // Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 100)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed);
    
        // Create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale)
            .tickFormat(d3.format(".0f"));  // Format ticks as integers
    
        // Place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        // Create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        console.log("Running createDropdown")
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){return d})
            .text(function(d){ return d });
    };//end of createDropdown

    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        console.log("Running changeAttribute");
        // Change the expressed attribute
        expressed = attribute;
        console.log("Expressed attribute changed to: ", expressed);
    
        // Recreate the color scale
        var colorScale = makeColorScale(csvData);
    
        // Recolor enumeration units
        d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d) {
                var value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
            });
    
        // Update the bars with transitions
        var chart = d3.select(".chart");
        var chartInnerWidth = 550 - 50 - 2;
        var chartInnerHeight = 460 - 5 * 2;
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed]); })]);
    
        updateBars(chart, csvData, colorScale, expressed, chartInnerWidth, chartInnerHeight, 50, yScale);
    
        // Update the axis with the new scale, transition to new values depending on attribute
        var yAxis = d3.axisLeft()
            .scale(yScale)
            .tickFormat(d3.format(".0f"));  // Format ticks as integers
    
        chart.select(".axis")
            .transition()
            .duration(1000)
            .call(yAxis);
    };

    function updateBars(chart, csvData, colorScale, expressed, chartInnerWidth, chartInnerHeight, leftPadding, yScale) {
        console.log("Running updateBars");
    
        // Sort the data based on the expressed attribute
        csvData.sort(function(a, b) {
            return parseFloat(a[expressed]) - parseFloat(b[expressed]);
        });
    
        // Bind data to bars
        var bars = chart.selectAll(".bar")
            .data(csvData, function(d) { return d.California_County; });  // Use a key function to bind data
    
        // Enter selection: create new bars
        bars.enter()
            .append("rect")
            .attr("class", function(d) {
                return "bar " + d.California_County.replace(/\s+/g, '_');
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed])) + 5;  // Adjusted y position to remove the gap
            })
            .style("fill", function(d) {
                return colorScale(d[expressed]);
            })
            .on("mouseover", function(event, d) {
                highlight(d);
            })
            .on("mouseout", function(event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
    
        // Update selection: update existing bars
        bars.transition()
            .delay(function(d, i) {
                return i * 20;  // Delay each bar by 20ms
            })
            .duration(500)  // 0.5 second duration
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i) {  // Update x position based on sorted data
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed])) + 5;  // Adjusted y position to remove the gap
            })
            .style("fill", function(d) {
                return colorScale(d[expressed]);
            });
    };

    //function to highlight enumeration units and bars, only run after mouseover events
    function highlight(props) {
        // Change stroke of the hovered element and corresponding bar
        var name = props.California_County.replace(/\s+/g, '_');
        d3.selectAll("." + name)
            .style("stroke", "blue")
            .style("stroke-width", "2")
            .style("fill-opacity", "0.7");
    
        setLabel(props); //also calls for infolabel to appear
    };
        
    //function to remove the highlight and infolabel 
    function dehighlight(props) {
        // Re-set stroke of the element and corresponding bar
        var name = props.California_County.replace(/\s+/g, '_');
            d3.selectAll("." + name)
                .style("stroke", null)
                .style("stroke-width", null)
                .style("fill-opacity", "1");

            d3.select(".infolabel").remove(); //removes the infolabel when no longer hovering
    };

    //function to create the infolabel
    function setLabel(props) {
        // Format the number with commas
        var formattedValue = parseFloat(props[expressed]).toLocaleString();
    
        // Label content
        var labelAttribute = "<h1>" + formattedValue +
            "</h1><b>" + expressed + "</b>";
    
        // Create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.California_County + "_label")
            .html(labelAttribute);
    
        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.California_County + " County");
    };

    function moveLabel(){
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

    //this function runs to zoom in on the county clicked on.
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
    };
})();