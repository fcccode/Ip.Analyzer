var ws_command;
var ws_messages;
var g_data;
//var g_data_pair_only = []; //array to filled with pairs data only
var g_data_tcp_pairs = [];
var g_database_obj;
var two_way_only = false;
var two_way_table_data; // =fill the variable with the data
var max_size;
let next_pairs;
let next;
let prev;
var start;
var rows_per_page = 100;
var limit = rows_per_page;
var table_data;
var from_database = false;
var table_result;


$(document).ready(function () {
    initialise();
});

function initialise() {
    var host = window.location.host;
    ws_command = new WebSocket("ws://" + host + "/ws/command");

    onLoad_data_refresh();


    ws_command.onmessage = function (evt) {
        parse_command_reply(evt.data);
    }

    ws_message = new WebSocket("ws://" + host + "/ws/progress_message");
    ws_message.onmessage = function (evt) {
        parse_message(evt.data);
    }

    ws_message = new WebSocket("ws://" + host + "/ws/message");
    ws_message.onmessage = function (evt) {
        Materialize.toast(evt.data, 1000);
    }

    table_result = $('#table_result_tcp tbody');

    $(table_result).delegate("tr", "click", function (e) {
        display_seq_data($(e.currentTarget).children(":nth-child(1)").html());
        $('#table_result_tcp tr').removeClass('green lighten-2');
        $(e.currentTarget).addClass('green lighten-2');
    });

    $('#top_nav').load("top_nav.html", function () {
        $('#nav_tcp').addClass('red lighten-2');
    });


    var pagerOptions = {
        container: $("#pager"),
        page: 0,
        size: 20,
        savePages: false,
    };
    /*******************************************************************************************/

    /**********************************this is the table sorter and pager code******************************************/
    $("#table_result_tcp").tablesorter({
        initWidgets: true,
        widgets: ['zebra', 'columns', 'filter']
    }).tablesorterPager(pagerOptions);


}

function parse_message(data) {
    var obj = JSON.parse(data);
    if (obj.type == "progress") {
        $('#p_current_file').html(obj.filename);
        $('#p_progress').html(numeral(obj.bytesRead).formatNumber() + '\\' + numeral(obj.fileSize).formatNumber() + ' (' + numeral(obj.bytesRead / obj.fileSize * 100).formatNumber(2) + '%)' + '(' + numeral(obj.seconds).formatNumber() + 'sec)');
        if (obj.total_time != undefined) {
            $("#total_time_elapsed").html('Total Time Elapsed: ' + numeral(obj.total_time).formatNumber() + 'sec');
        }
    }
}

function parse_command_reply(data) {
    var obj = JSON.parse(data);
    if (obj.type == "tcp_result") {
        console.log("Analysis data received.");
        display_analysis_data(obj);
        $('#btn_start_tcp_analysis').removeClass('disabled');
    } else if (obj.type == "load_from_db") {
        console.log("tcp data from database received.");
        from_database = true;
        two_way_only = false;
        display_analysis_data(JSON.parse(obj.data));
        $('#btn_load_selected_dbs').removeClass('disabled');
    } else if (obj.type == "tcp_database") {
        console.log("Full tcp database files received.");
        display_tcp_database(obj);
        $('#btn_get_tcp_database_all').removeClass('disabled');
    }
}

function onLoad_data_refresh() {
    ws_command.onopen = function (evt) {
        ws_command.send("get_tcp_database_all");
    }
}

function start_tcp_analysis() { //fucntion to start tcp analysis
    $('#btn_start_tcp_analysis').addClass('disabled');
    $('#table_result_tcp tbody').empty();
    ws_command.send("start_tcp_analysis");
}

function display_analysis_data(obj) { //for icmp analysis
    g_data = obj;
    two_way_table_data = obj.ip_streams;

    var j = 0;
    for (i = 0; i < two_way_table_data.length; i++) {
        if ((two_way_table_data[i].folders_FL instanceof Array) && (two_way_table_data[i].folders_RL instanceof Array)) {
            g_data_pair_only[j] = two_way_table_data[i];
            j++;
        }
    }

    stream_data_file_result_body(obj);
    initialise_stream_display();
}

function initialise_stream_display() {
    if (g_data == undefined) return;

    if (from_database == true) {
        limit = rows_per_page;
    }

    table_data = g_data.ip_streams;
    max_size = table_data.length;
    // var j = 0;
    // for (i = 0; i < table_data.length; i++) {
    //     if ((table_data[i].file_fl instanceof Array) && (table_data[i].file_rl instanceof Array)) {
    //         g_data_tcp_pairs[j] = table_data[i];
    //         j++;
    //     }
    // }
    start = 0;

    limit = Math.min(table_data.length, limit);
    // display_req_rep_pairs_only();
    display_stream_data(start, limit);
    //$('#p_table_result_info').html(1 + '-' + limit + '(' + max_size + ')');
}

function display_stream_data(start, limit) { //display of main data contents in the table
    table_result.empty();

    if (table_data == undefined || !(table_data instanceof Array)) return;

    for (i = start; i < limit; ++i) {
        var stream = table_data[i];

        var str = '<tr>';
        str += '<td>' + (i + 1) + '</td>';
        str += '<td>' + stream.srcIP + '</td>';
        str += '<td>' + stream.dstIP + '</td>';
        str += '<td>' + stream.file_fl + '</td>';
        str += '<td>' + stream.file_rl + '</td>';
        str += '</tr>';
        table_result.append(str);
    }
    $('#table_result_tcp').tablesorter().trigger('update');
}

function stream_data_file_result_body(obj) { //function to show number of files read , fl files , rl files, fl file path , rl file path
    // set d_num_files here from json
    $('#file_result tbody').empty();

    if (obj.data_info[0]) {
        var d_num = obj.data_info[0].number_of_files_read;
        document.getElementById("d_num_files").innerHTML = d_num;

        var dtr = '<tr>';
        dtr += '<td>'
        dtr += obj.data_info[0].filePathFL;
        dtr += '</td>'

        dtr += '<td>'
        dtr += obj.data_info[0].filePathRL;
        dtr += '</td>'

        dtr += '<td>'
        dtr += obj.data_info[0].CreatedAt;
        dtr += '</td>'

        if (obj.data_info[0].fl_files != undefined) {
            dtr += '<td>'
            for (j = 0; j < obj.data_info[0].fl_files.length; j++) {
                dtr += obj.data_info[0].fl_files[j] + '<br>';
            }
            dtr += '</td>'
        } else {
            dtr += '<td>'
            dtr += 'No_Files'
            dtr += '</td>'
        }


        if (obj.data_info[0].rl_files != undefined) {
            dtr += '<td>'
            for (j = 0; j < obj.data_info[0].rl_files.length; j++) {
                dtr += obj.data_info[0].rl_files[j] + '<br>';
            }
            dtr += '</td>'
        } else {
            dtr += '<td>'
            dtr += 'No_Files'
            dtr += '</td>'
        }


        dtr += '</tr>';
        $('#file_result tbody').append(dtr);
    }
}

function display_seq_data(idx) {
    //            if (two_way_only == true) {
    //                if (idx > 0 && idx <= g_data_pair_only.length) {
    //                    var stream = g_data_pair_only[idx - 1];
    //                }
    //            } else {
    //                if (idx > 0 && idx <= table_data.length) {
    //                    var stream = table_data[idx - 1];
    //                }
    //            }
    if (idx > 0 && idx <= table_data.length) {
        var stream = table_data[idx - 1];

        $('#table_sequence tbody').empty();

        $('#p_seq_src').html(stream.srcIP);
        $('#p_seq_dst').html(stream.dstIP);

        var str = "";


        str += '<tr>';
        // str += '<td>' + (k + 1) + '</td>';
        str += '<td>' + stream.tcp_stream.srcPort + '</td>';
        str += '<td>' + stream.tcp_stream.dstPort + '</td>';
        str += '<td>' + stream.tcp_stream.seq_num.length + '</td>';

        str += '<td>'
        for (k = 0; k < stream.tcp_stream.seq_num.length; k++) {
            str += stream.tcp_stream.seq_num[k] + '<br>';
        }
        str += '</td>';
        str += '<td>' + stream.tcp_stream.ack_num.length + '</td>';
        str += '<td>'
        for (k = 0; k < stream.tcp_stream.ack_num.length; k++) {
            str += stream.tcp_stream.ack_num[k] + '<br>';
        }
        str += '</td>';
        str += '</tr>';

        $('#table_sequence tbody').append(str);
    }
}

function display_tcp_database(obj) //for displaying data after loading the json from database		
{
    if (obj.data == undefined) return;

    $.each(obj.data, function (i, item) {
        $('#select_db_list').append($('<option>', {
            value: item,
            text: item
        }));
    });

    $('#select_db_list').material_select();
}

function load_selected_db() {
    $('#btn_load_selected_dbs').addClass('disabled');
    let selected_db = $('#select_db_list :selected').val();
    ws_command.send("load_selected_tcp_db&" + selected_db.toString());
}


//code to search IP address from the table
// function searchSrcFunction() {
//     // Declare variables 
//     var input, filter, table, tr, td, i;
//     input = document.getElementById("mySrcInput");
//     filter = input.value.toUpperCase();
//     table = document.getElementById("table_result_tcp");
//     tr = table.getElementsByTagName("tr");

//     // Loop through all table rows, and hide those who don't match the search query
//     for (i = 0; i < tr.length; i++) {
//         td = tr[i].getElementsByTagName("td")[1];
//         if (td) {
//             if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
//                 tr[i].style.display = "";
//             } else {
//                 tr[i].style.display = "none";
//             }
//         }
//     }
// }


function load_table_result_next() {
    if (two_way_only == true) {
        next_pairs = limit;
    } else {
        if (limit != max_size) {
            next = limit;
        }

    }
    if (two_way_only == true) {
        if (max_size > next_pairs) {
            limit = limit + rows_per_page;
            limit = Math.min(g_data_pair_only.length, limit);
            table_result.empty();
            funct_to_load_two_way_pairs(next_pairs, limit);
           // $('#p_table_result_info').html((next_pairs + 1) + '-' + limit + '(' + max_size + ')');
        }
    } else if (max_size > next) {
        limit = limit + rows_per_page;
        limit = Math.min(table_data.length, limit);
        table_result.empty();
        display_stream_data(next, limit);
       // $('#p_table_result_info').html((next + 1) + '-' + limit + '(' + max_size + ')');
    }
}

function load_table_result_prev() {
    if (two_way_only == true) {
        if ((limit % 100) == 0) {
            var prev_two_way = limit - (2 * rows_per_page);
            if (prev_two_way >= 0) {
                limit = limit - rows_per_page;
            } else {
                prev_two_way = 0;
                limit = Math.min(rows_per_page, limit);
            }
        } else {
            let diff_two_way = limit - next_pairs;
            limit = limit - diff_two_way;
            prev_two_way = limit - rows_per_page;
        }
        table_result.empty();
        funct_to_load_two_way_pairs(prev_two_way, limit);
        //$('#p_table_result_info').html((prev_two_way + 1) + '-' + limit + '(' + max_size + ')');


    } else {
        if (limit % 100 == 0) {
            prev = limit - 2 * rows_per_page;
            if (prev >= 0) {
                limit = limit - rows_per_page;
            }
            else {
                prev = 0;
                limit = rows_per_page;
            }
        }
        else {
            let diff = (limit - next);
            limit = limit - diff;
            prev = limit - rows_per_page;
        }
        table_result.empty();
        display_stream_data(prev, limit);
       // $('#p_table_result_info').html((prev + 1) + '-' + limit + '(' + max_size + ')');
    }
}

function load_two_way_tcp() {
    start = 0;
    two_way_only = true;
    if (g_data_tcp_pairs.length < 0) {
        console.log("none");
    }
    max_size = g_data_tcp_pairs.length;
    limit = Math.min(max_size, limit);
    //display_stream_data(start, limit);
    funct_to_load_two_way_pairs(start, limit);
    //$('#p_table_result_info').html(1 + '-' + limit + '(' + max_size + ')');
}

function funct_to_load_two_way_pairs(start, limit) // function to load two way data called by load_2_way_streams() function
{
    table_result.empty();
    if (g_data_tcp_pairs == undefined || !(g_data_tcp_pairs instanceof Array)) return;

    for (i = start; i < limit; ++i) {
        var stream = g_data_tcp_pairs[i];

        var str = '<tr>';
        str += '<td>' + (i + 1) + '</td>';
        str += '<td>' + stream.srcIP + '</td>';
        str += '<td>' + stream.dstIP + '</td>';
        str += '<td>' + stream.file_fl + '</td>';
        str += '<td>' + stream.file_rl + '</td>';
        str += '</tr>';
        table_result.append(str);
    }
}

function load_all_tcp_streams() {
    start = 0;
    limit = rows_per_page;
    two_way_only = false;
    max_size = table_data.length;
    display_stream_data(start, limit);
   // $('#p_table_result_info').html(1 + '-' + limit + '(' + max_size + ')');
}