// main

$(document).ready(function () {
    $(window).on('resize', function () {
        // Debounce the resize event to prevent excessive layout calls
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(refreshMasonryLayout, 250); // Adjust the delay (in milliseconds) as needed
    });

    $(window).on('load resize', markOverflowingElements);

    addToTabTitle('Home');

    $.getJSON('modules.json')
        .done(function (data) {
            if (data && Array.isArray(data.modules)) {
                $('.settingsBtn').on('click', function () {
                    openSettingsWindow(data.modules); // Pass the modules data
                });

                loadModules(); // Load modules on initial page load

                $(document).on('click', '.module', function () {
                    $('.module').removeClass('focus');
                    $(this).addClass('focus');
                });

            } else {
                console.error(`Error: Could not load modules.  Invalid data.`);
                $('.container').html('<p class="error">Could not load modules.</p>');
            }
            markOverflowingElements();

        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error(`Error loading modules.json: ${textStatus}, ${errorThrown}`);
            $('.container').html('<p class="error">Could not load modules.</p>');
        });

    $(document).on("click", function (e) {
        var container2 = $('.module');
        if (!container2.is(e.target) && container2.has(e.target).length === 0) {
            $('.module').removeClass('focus')
        }

        var container4 = $('.googApps');
        var container4Btn = $('.waffleBtn');
        if (!container4.is(e.target) && container4.has(e.target).length === 0 && !container4Btn.is(e.target) && container4Btn.has(e.target).length === 0) {
            container4.removeClass('visible');
        }

        var container1 = $('.settingsWindow');
        var container1Btn = $('.settingsBtn');
        if (!container1.is(e.target) && container1.has(e.target).length === 0 && !container1Btn.is(e.target) && container1Btn.has(e.target).length === 0) {
            $('.settingsWindow').removeClass('visible'); // Close the popup
        }

        var container5 = $('.searchTxt');
        var container5Btn = $('#autocompleteResults');
        if (!container5.is(e.target) && container5.has(e.target).length === 0 && !container5Btn.is(e.target) && container5Btn.has(e.target).length === 0) {
            $('#searchBox').val('')
            $("#autocompleteResults").empty().hide();
        }
    });

    var savedPosition = localStorage.getItem("toolbarPosition");
    if (savedPosition) {
        applyToolbarPosition(savedPosition);
        $("input[name='toolbar-position'][value='" + savedPosition + "']").prop("checked", true);
    }

    $("input[name='toolbar-position']").on("change", function () {
        var position = $(this).val();
        applyToolbarPosition(position);
        localStorage.setItem("toolbarPosition", position);
    });

    $(document).on("click", ".refresh-icon", function () {
        const $module = $(this).closest('.module');
        const moduleId = $module.attr('id');
        const $container = $('.container');
        const moduleIndex = $module.index();

        // Fetch modules.json and find the module to re-add
        $.getJSON('modules.json')
            .done(function (data) {
                if (data && Array.isArray(data.modules)) {
                    const targetModule = data.modules.find(m => m.id === moduleId);
                    if (targetModule) {
                        // Remove current module
                        $module.fadeOut(150, function () {
                            $module.remove();

                            // Re-render just this module
                            const $newModule = renderModule(targetModule);
                            if ($newModule) {
                                if (moduleIndex >= $container.children('.module').length) {
                                    $container.append($newModule);
                                } else {
                                    $container.children('.module').eq(moduleIndex).before($newModule);
                                }
                                $container.masonry('reloadItems').masonry('layout');
                            }
                        });
                    }
                }
                markOverflowingElements();
            });
    });
    $(document).on("click", ".external-icon", function () { window.open($(this).attr('external')) })
    $(document).on("click", ".minimize-icon", function () {
        const $module = $(this).closest('.module');
        $module.toggleClass('minimized');
        if ($module.hasClass('minimized')) {
            $(this).attr('hoverTxt', 'Maximize');
        } else {
            $(this).attr('hoverTxt', 'Minimize');
        }
        let fallbackTimer = setTimeout(() => {
            refreshMasonryLayout();
            markOverflowingElements();
            saveWidgetStates();
        }, 300);

        $module.one('transitionend', function () {
            clearTimeout(fallbackTimer);
            requestAnimationFrame(() => {
                forceRebuildMasonry();
                setTimeout(() => {
                    $('.container').masonry('layout');
                    saveWidgetStates();
                }, 100);
            });
        });
    });
});

// Wallpaper

$(document).ready(function () {
    const defaultImagePath = 'resc/default.png'; // Changed to relative path
    const $imageDisplay = $('#imageDisplay');
    const $backImg = $('.backImg');

    async function fetchBingWallpaper() {
        try {
            const imageUrl = 'https://picsum.photos/1920/1080?random=' + Date.now();
            const base64Image = await loadImageOntoCanvas(imageUrl);
            localStorage.setItem('backgroundImage', base64Image);
            $imageDisplay.attr('src', base64Image);
            $backImg.attr('src', base64Image);
        } catch (error) {
            console.error('Failed to fetch Bing wallpaper:', error);
            // alert('Could not load Bing image.');
        }
    }

    $('#refreshBingBtn').on('click', async function () {
        const imageUrl = 'https://picsum.photos/1920/1080?random=' + Date.now();
        const $imageDisplay = $('#imageDisplay');
        const $backImg = $('.backImg');
        localStorage.setItem('backgroundImage', imageUrl);
        $imageDisplay.attr('src', imageUrl);
        $backImg.attr('src', imageUrl);
    });

    $('input[name="wallpaperSource"]').on('change', async function () {
        localStorage.setItem('wallpaperSource', $(this).val());
        const selectedSource = $(this).val();
        if (selectedSource === 'upload') {
            $('#fileInput').show();
            $('#refreshBingBtn').hide();
            const uploadedImage = localStorage.getItem('uploadedImage');
            if (uploadedImage) {
                $imageDisplay.attr('src', uploadedImage);
                $backImg.attr('src', uploadedImage);
            } else {
                // fallback if no image uploaded yet
                $imageDisplay.attr('src', defaultImagePath);
                $backImg.attr('src', defaultImagePath);
            }
        } else if (selectedSource === 'bing') {
            $('#fileInput').hide();
            $('#refreshBingBtn').show();
            const imageUrl = 'https://picsum.photos/1920/1080?random=' + Date.now();
            localStorage.setItem('backgroundImage', imageUrl);
            $imageDisplay.attr('src', imageUrl);
            $backImg.attr('src', imageUrl);
        }
    });

    function loadImageOntoCanvas(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function () {
                const originalWidth = img.width;
                const originalHeight = img.height;

                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');

                if (originalWidth > 1920 || originalHeight > 1080) {
                    // Calculate the aspect ratio
                    const imgRatio = originalWidth / originalHeight;
                    const maxWidth = 1920;
                    const maxHeight = 1080;

                    let scaledWidth = originalWidth;
                    let scaledHeight = originalHeight;

                    if (scaledWidth > maxWidth) {
                        scaledWidth = maxWidth;
                        scaledHeight = maxWidth / imgRatio;
                    }
                    if (scaledHeight > maxHeight) {
                        scaledHeight = maxHeight;
                        scaledWidth = maxHeight * imgRatio;
                    }
                    canvas.width = scaledWidth;
                    canvas.height = scaledHeight;
                    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
                    resolve(canvas.toDataURL('image/png')); // Return scaled version
                } else {
                    // If image is within 1080p, return original as base64
                    canvas.width = originalWidth;
                    canvas.height = originalHeight;
                    ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
                    resolve(canvas.toDataURL('image/png'));
                }
            };
            img.onerror = reject;
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;
        });
    }

    $('#fileInput').on('change', function (event) {
        const file = event.target.files[0];

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();

            reader.onload = async function (e) {
                const imageUrl = e.target.result;

                // Update the img element for display
                $imageDisplay.attr('src', imageUrl);

                // Load onto canvas and save
                try {
                    const base64Image = await loadImageOntoCanvas(imageUrl);
                    localStorage.setItem('backgroundImage', base64Image);
                    localStorage.setItem('uploadedImage', base64Image);
                    // Update the src attribute of the .backImg img element
                    $backImg.attr('src', base64Image);
                } catch (error) {
                    console.error('Error loading image onto canvas:', error);
                    alert('Failed to process the image.');
                }
            };

            reader.readAsDataURL(file);
        } else if (file) {
            alert('Please select a valid image file.');
            $('#fileInput').val('');
        }
    });

    // Auto-load from local storage or default on page load
    async function loadInitialImage() {
        const savedSource = localStorage.getItem('wallpaperSource') || 'upload';
        const uploadedImage = localStorage.getItem('uploadedImage');
        const backgroundImage = localStorage.getItem('backgroundImage');

        if (savedSource === 'upload') {
            $('input[name="wallpaperSource"][value="upload"]').prop('checked', true);
            $('#fileInput').show();
            $('#refreshBingBtn').hide();
            const image = uploadedImage || defaultImagePath;
            $imageDisplay.attr('src', image);
            $backImg.attr('src', image);
        } else if (savedSource === 'bing') {
            $('input[name="wallpaperSource"][value="bing"]').prop('checked', true);
            $('#fileInput').hide();
            $('#refreshBingBtn').show();
            if (backgroundImage) {
                $imageDisplay.attr('src', backgroundImage);
                $backImg.attr('src', backgroundImage);
            }
        }
    }

    loadInitialImage();
});

// Searchbox

$(document).ready(function () {
    $("#searchBox").on("input", function () {
        var query = $(this).val();
        if (query.length >= 3) { // Start suggesting after 3 characters
            $.ajax({
                url: "https://suggestqueries.google.com/complete/search",
                dataType: "jsonp",
                data: {
                    q: query,
                    client: "chrome" // You can adjust the client
                },
                success: function (data) {
                    $("#autocompleteResults").empty();
                    if (data && data[1]) {
                        $.each(data[1], function (index, suggestion) {
                            $("#autocompleteResults").append("<div class='autocomplete-item'>" + suggestion + "</div>");
                        });
                        $("#autocompleteResults").show();
                    } else {
                        $("#autocompleteResults").hide();
                    }
                }
            });
        } else {
            $("#autocompleteResults").empty().hide();
        }
    });

    // Handle autocomplete item selection
    $(document).on("click", ".autocomplete-item", function () {
        performGoogleSearch($(this).text());
    });

    $("#searchBox").on("keypress", function (event) {
        if (event.which === 13) { // Enter key
            var query = $("#searchBox").val();
            if (query) {
                performGoogleSearch(query);
            }
        }
    });

    $('.waffleBtn').on('click', function () {
        $('.googApps').addClass('visible');
    })

    function performGoogleSearch(query) {
        var googleSearchUrl = "https://www.google.com/search?q=" + encodeURIComponent(query);
        window.location.href = googleSearchUrl;
    }
});

// Helper function to render a module
function renderModule(module) {
    const moduleWidth = 350;
    let $moduleDiv = $('<div>').addClass('module').attr('id', module.id).css('width', moduleWidth);
    if (module.height) $moduleDiv.css('height', module.height);
    if (module.mode) $moduleDiv.addClass(module.mode);

    let $header = $('<div>').addClass('header');
    if (module.icon) $('<i>').addClass('icon').addClass(module.icon).appendTo($header);
    if (module.name) $(`<h2 class="title">${module.name}</h2>`).appendTo($header);

    let $modHeadBtns = $('<div class="modHeadBtns">');
    if (module.externalLink) {
        $(`<i class="header-icon external-icon fa-solid fa-arrow-up-right-from-square" hoverTxt="Open" external="${module.externalLink}">`)
            .on("mouseover", function () {
                let thisModule = $(this).parent().parent().parent();
                thisModule.find('.title').text($(this).attr('hoverTxt'));
            }).on('mouseout', function () {
                let thisModule = $(this).parent().parent().parent();
                thisModule.find('.title').text(module.name);
            })
            .appendTo($modHeadBtns);
    }

    $('<i class="header-icon refresh-icon fa-solid fa-rotate" hoverTxt="Refresh">')
        .on("mouseover", function () {
            let thisModule = $(this).parent().parent().parent();
            thisModule.find('.title').text($(this).attr('hoverTxt'));
        }).on('mouseout', function () {
            let thisModule = $(this).parent().parent().parent();
            thisModule.find('.title').text(module.name);
        })
        .appendTo($modHeadBtns);

    $('<i class="header-icon minimize-icon fa-solid fa-minus" hoverTxt="Minimize">')
        .on("mouseover", function () {
            let thisModule = $(this).parent().parent().parent();
            thisModule.find('.title').text($(this).attr('hoverTxt'));
        }).on('mouseout', function () {
            let thisModule = $(this).parent().parent().parent();
            thisModule.find('.title').text(module.name);
        })
        .appendTo($modHeadBtns);

    $header.append($modHeadBtns);
    $moduleDiv.append($header);

    let $moduleContent;
    switch (module.contentType) {
        case 'iframe':
            if (module.url) {
                const $iframe = $('<iframe>')
                    .attr('src', module.url)
                    .attr('frameborder', '0')
                    .attr('title', module.name || 'Embedded Content');
                $moduleContent = $('<div>').addClass('module-content module-content-iframe').append($iframe);
            } else {
                const nativeFile = `nativeModule/${module.id}.html`;
                $.get(nativeFile)
                    .done(function () {
                        const $iframe = $('<iframe>').attr('src', nativeFile).attr('frameborder', '0').attr('title', module.name || 'Embedded Content');
                        $moduleContent = $('<div>').addClass('module-content module-content-iframe').append($iframe);
                        $moduleDiv.append($moduleContent);
                        refreshMasonryLayout();
                    })
                    .fail(function () {
                        $moduleContent = $('<div>').addClass('module-content module-content-error').text('Iframe URL missing and native module file not found.');
                        $moduleDiv.append($moduleContent);
                    });
                return $moduleDiv; // Exit early for async handling
            }
            break;
        case 'html':
            if (module.htmlContent) {
                $moduleContent = $('<div>').addClass('module-content module-content-html').html(module.htmlContent);
            } else {
                const htmlFile = `nativeModule/${module.id}.html`;
                $.get(htmlFile)
                    .done(function (htmlData) {
                        $moduleContent = $('<div>').addClass('module-content module-content-html').html(htmlData);
                        $moduleDiv.append($moduleContent);
                        $('.container').masonry('reloadItems').masonry('layout');
                    })
                    .fail(function () {
                        $moduleContent = $('<div>').addClass('module-content module-content-error').text("Failed to load html");
                        $moduleDiv.append($moduleContent);
                    });
                return $moduleDiv; // Exit early for async handling
            }
            break;
        case 'standard':
        default:
            $moduleContent = $('<div>').addClass('module-content module-content-standard').html('<p>Standard module area.</p>');
            break;
    }

    $moduleDiv.append($moduleContent);
    return $moduleDiv;
}

// functions

function markOverflowingElements() {
    $('.module').each(function () {
        const $module = $(this);
        let hasOverflow = false;

        // Check module itself
        const el = $module[0];
        if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            hasOverflow = true;
        }

        // Check children
        if (!hasOverflow) {
            $module.find('*').each(function () {
                const child = this;
                if (child.scrollHeight > child.clientHeight || child.scrollWidth > child.clientWidth) {
                    hasOverflow = true;
                    return false; // Break out of .each loop
                }
            });
        }

        $module.toggleClass('has-scroll', hasOverflow);
    });
}

function applyToolbarPosition(position) {
    $('.toolbar').removeClass('toolbar-left toolbar-center toolbar-right')
        .addClass('toolbar-' + position);
}

function saveWidgetStates() {
    let states = [];
    $('.container .module').each(function () {
        states.push({
            id: $(this).attr('id'),
            minimized: $(this).hasClass('minimized')
        });
    });
    localStorage.setItem('moduleStates', JSON.stringify(states));
}

function restoreWidgetStates() {
    const storedStates = localStorage.getItem('moduleStates');
    if (storedStates) {
        try {
            const states = JSON.parse(storedStates);
            const $container = $('.container');
            states.forEach(state => {
                const $module = $('#' + state.id);
                if ($module.length) {
                    // Set the minimized state based on saved value
                    $module.toggleClass('minimized', state.minimized);
                    // Reorder: appending moves the element to the end in the desired order
                    $container.append($module);
                }
            });
            refreshMasonryLayout();
        } catch (e) {
            console.error("Error restoring widget states:", e);
        }
    }
}

function forceRebuildMasonry() {
    const $container = $('.container');

    if ($container.data('masonry')) {
        $container.masonry('destroy'); // Blow it up
    }

    // Rebuild it
    $container.masonry({
        itemSelector: '.module',
        fitWidth: true,
        scroll: false,
        gutter: 15
    });
}

function refreshMasonryLayout() {
    const $container = $('.container');
    if ($container.hasClass('ui-sortable')) {
        $container.sortable('refresh');
    }

    if ($container.data('masonry')) {
        $container.masonry('reloadItems').masonry('layout');
    }
}

function loadModules() {
    const jsonUrl = 'modules.json';
    const $targetContainer = $('.container'); // Hardcoded to use '.container'
    const moduleWidth = 350; // Define your module width

    if (!$targetContainer.length) {
        console.error(`Error: Target container ".container" not found.`);
        return;
    }

    $.getJSON(jsonUrl)
        .done(function (data) {
            if (data && Array.isArray(data.modules)) {
                const selectedModuleIds = JSON.parse(localStorage.getItem('selectedModules')) || [];
                const modulesToShow = selectedModuleIds.length > 0
                    ? data.modules.filter(m => selectedModuleIds.includes(m.id))
                    : data.modules; // Show all if none selected

                $targetContainer.children('.module').remove(); // Clear existing content before adding modules

                $.each(modulesToShow, function (index, module) {
                    if (!module.noShow) {
                        let $moduleDiv = $('<div>')
                            .addClass('module')
                            .attr('id', module.id || `module-${index}`)
                            .attr('name', module.name)
                            .css('width', moduleWidth); // Apply the fixed width

                        if (module.height) {
                            $moduleDiv.css('height', module.height); // Apply dynamic height class if provided
                        }

                        if (module.mode) {
                            $moduleDiv.addClass(module.mode);
                        }

                        let $header = $('<div>').addClass('header');

                        if (module.icon) {
                            $('<i>')
                                .addClass('icon')
                                .addClass(module.icon)
                                .appendTo($header);
                        }
                        if (module.name) {
                            $(`<h2 class="title">${module.name}</h2>`).appendTo($header);
                        }

                        let $modHeadBtns = $('<div class="modHeadBtns">');

                        if (module.externalLink) {
                            $(`<i class="header-icon external-icon fa-solid fa-arrow-up-right-from-square" hoverTxt="Open" external="${module.externalLink}">`)
                                .on("mouseover", function () {
                                    let thisModule = $(this).parent().parent().parent();
                                    thisModule.find('.title').text($(this).attr('hoverTxt'));
                                }).on('mouseout', function () {
                                    let thisModule = $(this).parent().parent().parent();
                                    thisModule.find('.title').text(module.name);
                                })
                                .appendTo($modHeadBtns);
                        }

                        $('<i class="header-icon refresh-icon fa-solid fa-rotate" hoverTxt="Refresh">')
                            .on("mouseover", function () {
                                let thisModule = $(this).parent().parent().parent();
                                thisModule.find('.title').text($(this).attr('hoverTxt'));
                            }).on('mouseout', function () {
                                let thisModule = $(this).parent().parent().parent();
                                thisModule.find('.title').text(module.name);
                            })
                            .appendTo($modHeadBtns);

                        $('<i class="header-icon minimize-icon fa-solid fa-minus" hoverTxt="Minimize">')
                            .on("mouseover", function () {
                                let thisModule = $(this).parent().parent().parent();
                                thisModule.find('.title').text($(this).attr('hoverTxt'));
                            }).on('mouseout', function () {
                                let thisModule = $(this).parent().parent().parent();
                                thisModule.find('.title').text(module.name);
                            })
                            .appendTo($modHeadBtns);

                        $header.append($modHeadBtns);
                        $moduleDiv.append($header);

                        // --- Content Type Handling ---
                        let $moduleContent; // Declare $moduleContent once
                        switch (module.contentType) {
                            case 'iframe':
                                if (module.url) {
                                    const $iframe = $('<iframe>')
                                        .attr('src', module.url)
                                        .attr('frameborder', '0')
                                        .attr('title', module.name || 'Embedded Content');
                                    $moduleContent = $('<div>').addClass('module-content module-content-iframe').append($iframe);
                                } else {
                                    const nativeFile = `nativeModule/${module.id}.html`;
                                    asyncContent = true;
                                    $.get(nativeFile)
                                        .done(function (htmlData) {
                                            // File exists; create iframe with nativeFile as the src
                                            const $iframe = $('<iframe>')
                                                .attr('src', nativeFile)
                                                .attr('frameborder', '0')
                                                .attr('title', module.name || 'Embedded Content');
                                            $moduleContent = $('<div>').addClass('module-content module-content-iframe').append($iframe);
                                            $moduleDiv.append($moduleContent);
                                            refreshMasonryLayout();
                                        })
                                        .fail(function (jqXHR, textStatus, errorThrown) {
                                            console.warn(`Module "${module.name}" has contentType 'iframe' but no 'url', and native file ${nativeFile} not found: ${textStatus}, ${errorThrown}`);
                                            $moduleContent = $('<div>').addClass('module-content module-content-error').text('Iframe URL missing and native module file not found.');
                                            $moduleDiv.append($moduleContent);
                                        });
                                }
                                break;

                            case 'html':
                                if (module.htmlContent) {
                                    $moduleContent = $('<div>')
                                        .addClass('module-content module-content-html')
                                        .html(module.htmlContent); // Use .html() to interpret HTML
                                } else {
                                    const htmlFile = `nativeModule/${module.id}.html`;
                                    $.get(htmlFile)
                                        .done(function (htmlData) {
                                            $moduleContent = $('<div>').addClass('module-content module-content-html').html(htmlData);
                                            $moduleDiv.append($moduleContent);
                                            // After loading HTML, reload Masonry layout
                                            $targetContainer.masonry('reloadItems').masonry('layout');
                                        })
                                        .fail(function (jqXHR, textStatus, errorThrown) {
                                            console.error(`Error loading HTML file ${htmlFile}: ${textStatus}, ${errorThrown}`);
                                            $moduleContent = $('<div>').addClass('module-content module-content-error').text("Failed to load html");
                                            $moduleDiv.append($moduleContent);
                                        })
                                    break;
                                }
                                break;

                            case 'standard':
                            default:
                                $moduleContent = $('<div>').addClass('module-content module-content-standard').html('<p>Standard module area.</p>');
                                break;
                        }
                        $moduleDiv.append($moduleContent);  // Append the content *once*
                        $targetContainer.append($moduleDiv);
                    }
                });

                // Initialize Masonry after modules are added
                const masonryOptions = {
                    itemSelector: '.module',
                    fitWidth: true,
                    scroll: false,
                    gutter: 15
                };
                $targetContainer.masonry(masonryOptions);

                // Initialize Sortable on the container
                $targetContainer.sortable({
                    tolerance: 'pointer',
                    handle: '.header',
                    update: function (event, ui) {
                        // Save the new order and states after sorting
                        saveWidgetStates();
                        $targetContainer.masonry('reloadItems').masonry('layout');
                    },
                    start: function (event, ui) {
                        ui.item.addClass('dragging');
                        $('.module').removeClass('focus');
                        ui.item.addClass('focus');
                    },
                    stop: function (event, ui) {
                        $targetContainer.masonry('destroy'); // Destroy Masonry before dragging
                        ui.item.removeClass('dragging');
                        // Reinitialize Masonry after dragging stops
                        $targetContainer.masonry(masonryOptions);
                        saveWidgetStates();
                    }
                });

                // After all modules have been added and Masonry has been initialized...
                restoreWidgetStates();
            } else {
                console.error(`Error: JSON data from ${jsonUrl} is missing the "modules" array.`);
                $targetContainer.html('<p class="error">Could not load modules: Invalid data format.</p>');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error(`Error loading modules from ${jsonUrl}: ${textStatus}, ${errorThrown}`);
            $targetContainer.html(`<p class="error">Could not load modules. Please check the console for details (File: ${jsonUrl}).</p>`);
        });
}

function openModuleSelector(modules) {
    const $popup = $('.module-selector-popup');
    const $moduleList = $('<ul>').addClass('module-list');
    const $filterContainer = $('<div class="category-filters">');
    const allCategories = [...new Set(modules.flatMap(m => m.category || []))].sort();

    const $clearBtn = $('<button class="filter-btn clear selected" style="order: 999; margin-left: auto;">Clear</button>').on('click', function () {
        $('.filter-btn').removeClass('selected');
        $(this).addClass('selected');
        $moduleList.children().show();
    });
    $filterContainer.append($clearBtn);

    allCategories.forEach(category => {
        const $btn = $(`<button class="filter-btn">${category}</button>`).on('click', function () {
            // Remove selected class from all filter buttons
            $('.filter-btn').removeClass('selected');
            // Add selected class to the clicked button
            $(this).addClass('selected');

            $moduleList.children().hide().filter((_, el) => {
                const categories = ($(el).data('categories') || "").split(',');
                return categories.includes(category);
            }).show();
        });
        $filterContainer.append($btn);
    });

    const $settings = $('.settingsWindow');

    const selectedModuleIds = JSON.parse(localStorage.getItem('selectedModules')) || [];

    // Sort the modules array alphabetically by name
    modules.sort((a, b) => {
        const nameA = a.name.toUpperCase(); // Ignore case
        const nameB = b.name.toUpperCase(); // Ignore case
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0; // names are equal
    });

    modules.forEach(module => {
        if (!module.noShow) {
            const $listItem = $('<li>').addClass('module-item');

            const $icon = $('<i>').attr('class', module.icon);

            const $description = $('<p>')
                .addClass('desc')
                .text(module.description);

            const $nameText = $('<p>')
                .addClass('name')
                .text(module.name);

            $listItem.append($icon, $nameText, $description);

            $listItem.attr('data-module-id', module.id);
            $listItem.attr('data-categories', (module.category || []).join(','));

            if (selectedModuleIds.includes(module.id)) {
                $listItem.addClass('selected');
            }

            $listItem.on('click', function () {
                $(this).toggleClass('selected');

                const selectedIds = $moduleList.find('.selected')
                    .map((_, el) => $(el).data('module-id'))
                    .get();

                localStorage.setItem('selectedModules', JSON.stringify(selectedIds));
                loadModules();
                forceRebuildMasonry();
                refreshMasonryLayout();
            });

            $moduleList.append($listItem);
        }
    });

    $popup.addClass('visible');


    const $cancelButton = $('.actionBtn.cancel');
    $cancelButton.off('click').on('click', function () {
        addToTabTitle('Home');
        $settings.removeClass('visible'); // Close the popup
        $('*').blur();
    });

    $popup.empty();
    $popup.append($filterContainer, $moduleList);

    $settings.addClass('visible');
}

function openSettingsWindow(modules) {
    addToTabTitle('Settings');
    openModuleSelector(modules);

    $('.settingsWindow').each(function () {
        var $settingsWindow = $(this);
        if ($('.tabButtons').length <= 0) {
            var $tabButtons = $('<div class="tabButtons"></div>');

            $settingsWindow.find('.tab').each(function () {
                var tabAttribute = $(this).attr('tab');
                var selectedTab = $(this).hasClass('selected');
                if (tabAttribute) {
                    var $tabBtn = $(`<button class="tabBtn" tab="${tabAttribute}"><p>${tabAttribute}</p></button>`)
                        .on('click', function () {
                            $('.tab.selected').removeClass('selected');
                            $('.tabBtn.selected').removeClass('selected');
                            $(`.tab[tab="${tabAttribute}"]`).addClass('selected');
                            $(`.tabBtn[tab="${tabAttribute}"]`).addClass('selected');
                        })
                        .prepend(`<i class="fa-solid ${$(this).attr('icon')}">`);

                    if (selectedTab) {
                        $tabBtn.addClass('selected');
                    }
                    $tabButtons.append($tabBtn);
                }
            });

            $settingsWindow.prepend($tabButtons);
        }
    });
}

function addToTabTitle(suffix) {
    const baseTitle = "Youie";
    if (suffix && typeof suffix === 'string' && suffix.trim() !== "") {
        document.title = `${baseTitle} - ${suffix}`;
    } else {
        document.title = baseTitle;
    }
}