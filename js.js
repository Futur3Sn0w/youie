// main

$(document).ready(function () {
    $(window).on('resize', function () {
        // Debounce the resize event to prevent excessive layout calls
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(forceRebuildMasonry, 250); // Adjust the delay (in milliseconds) as needed
        saveWidgetStates();
    });

    $(window).on('load resize', markOverflowingElements);

    addToTabTitle('Home');

    $.getJSON('modules.json')
        .done(function (data) {
            if (data && Array.isArray(data.modules)) {
                const customModules = JSON.parse(localStorage.getItem('customModules') || '[]');
                data.modules = [...customModules, ...data.modules];
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
        // Deselect modules if clicking outside
        if (!e.target.closest('.module')) {
            $('.module').removeClass('focus');
        }

        if (!e.target.closest('.googApps') && !e.target.closest('.waffleBtn')) {
            $('.googApps').removeClass('visible');
        }

        if (!e.target.closest('.settingsWindow') && !e.target.closest('.settingsBtn') &&
            !e.target.closest('#globalPopup')) {
            $('.settingsWindow').removeClass('visible');
        }

        if (!e.target.closest('.searchTxt') && !e.target.closest('#autocompleteResults')) {
            $('#searchBox').val('');
            $("#autocompleteResults").empty().hide();
        }

        if (!e.target.closest('.module-menu') && !e.target.closest('.menu-icon')) {
            $('.module-menu').removeClass('visible');
        }

        if (!e.target.closest('.popup-inner') && !e.target.closest('.module-menu') &&
            !e.target.closest('.settingsWindow')) {
            $('.global-popup').removeClass('visible');
        }
    });

    $(document).on('click', '#globalPopup .popup-close', function () {
        $('#globalPopup').removeClass('visible');
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
                    const customModules = JSON.parse(localStorage.getItem('customModules') || '[]');
                    data.modules = [...customModules, ...data.modules];
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
            forceRebuildMasonry();
            markOverflowingElements();
            saveWidgetStates();
        }, 300);

        $module.one('transitionend', function () {
            clearTimeout(fallbackTimer);
            requestAnimationFrame(() => {
                forceRebuildMasonry();
                saveWidgetStates();
            });
        });
    });
});

// Wallpaper

$(document).ready(function () {
    const defaultImagePath = 'resc/default.png'; // Changed to relative path
    const $imageDisplay = $('#imageDisplay');
    const $backImg = $('.backImg');

    async function fetchBingWallpaper(forceRefresh = false) {
        const lastFetched = parseInt(localStorage.getItem('bingImageTimestamp') || "0", 10);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (!forceRefresh && localStorage.getItem('backgroundImage') && now - lastFetched < twentyFourHours) {
            const cachedImage = localStorage.getItem('backgroundImage');
            $imageDisplay.attr('src', cachedImage);
            $backImg.attr('src', cachedImage);
            return;
        }

        try {
            const imageUrl = 'https://picsum.photos/1920/1080?random=' + now;
            const base64Image = await loadImageOntoCanvas(imageUrl);
            localStorage.setItem('backgroundImage', base64Image);
            localStorage.setItem('bingImageTimestamp', now.toString());
            $imageDisplay.attr('src', base64Image);
            $backImg.attr('src', base64Image);
        } catch (error) {
            console.error('Failed to fetch Bing wallpaper:', error);
            const cachedImage = localStorage.getItem('backgroundImage');
            if (cachedImage) {
                $imageDisplay.attr('src', cachedImage);
                $backImg.attr('src', cachedImage);
            }
        }
    }

    $('#refreshBingBtn').on('click', async function () {
        await fetchBingWallpaper(true);
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
            await fetchBingWallpaper(false);
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

// functions

function showGlobalPopup(title, body) {
    const $popup = $('#globalPopup');
    $popup.find('.popup-title').text(title);

    if (typeof body === 'string') {
        $popup.find('.popup-body').html(`<p>${body}</p>`);
    } else if (body instanceof jQuery || body instanceof HTMLElement) {
        $popup.find('.popup-body').empty().append(body);
    }

    $popup.addClass('visible');
}

function createHeaderButtons(module) {
    let $modHead = $('<div class="modHeadBtns">');
    let $modActions = $('<div class="modActions">');

    // Standard icons
    $('<i class="header-icon refresh-icon fa-solid fa-rotate" hoverTxt="Refresh">')
        .on("mouseover", function () {
            $(this).closest('.module').find('.title').text($(this).attr('hoverTxt'));
        }).on('mouseout', function () {
            $(this).closest('.module').find('.title').text(module.name);
        }).appendTo($modActions);

    $('<i class="header-icon minimize-icon fa-solid fa-minus" hoverTxt="Minimize">')
        .on("mouseover", function () {
            $(this).closest('.module').find('.title').text($(this).attr('hoverTxt'));
        }).on('mouseout', function () {
            $(this).closest('.module').find('.title').text(module.name);
        }).appendTo($modActions);

    // Menu toggle icon
    $('<i class="header-icon menu-icon fa-solid fa-ellipsis-vertical" hoverTxt="Menu">')
        .on("click", function (e) {
            e.stopPropagation();
            const $thisModule = $(this).closest('.module');
            const $menu = $thisModule.find('.module-menu');
            $('.module').removeClass('focus');
            $thisModule.addClass('focus');
            $('.module-menu').not($menu).removeClass('visible');
            $menu.toggleClass('visible');
        }).appendTo($modActions);

    $modActions.appendTo($modHead);

    // Create module-menu and populate it
    const $menu = $('<div class="module-menu">');
    if (module.externalLink) {
        $menu.append('<div class="module-action" data-action="view"><i class="fa-solid fa-arrow-up-right-from-square"></i> View More</div>');
    }
    try {
        const states = JSON.parse(localStorage.getItem('moduleStates') || '[]');
        const firstModuleId = states.length > 0 ? states[0].id : null;
        if (module.id !== firstModuleId) {
            $menu.append('<div class="module-action" data-action="move-top"><i class="fa-solid fa-arrow-up"></i> Move to Top</div>');
        }
    } catch (e) {
        console.error('Failed to check moduleStates:', e);
        $menu.append('<div class="module-action" data-action="move-top"><i class="fa-solid fa-arrow-up"></i> Move to Top</div>');
    }
    $menu.append('<div class="module-action" data-action="info"><i class="fa-solid fa-circle-info"></i> Module Info</div>');
    $menu.append('<div class="module-action" data-action="delete"><i class="fa-solid fa-eye-slash"></i> Remove Module</div>');

    // Add handlers once
    $menu.on('click', '.module-action', function () {
        const $thisModule = $(this).closest('.module');
        const action = $(this).data('action');
        if (action === 'view') {
            window.open(module.externalLink, '_blank');
        } else if (action === 'info') {
            let infoHtml = `
            <div class="module-info-inner">
                <p class="aka-text">(AKA: <strong>${module.id}</strong>)</p>
                <p class="module-icon"><i class="${module.icon}"></i></p>
                <p class="module-desc">${module.description || 'No description provided.'}</p>
        `;

            if (module.contentType === 'rss' && module.feedUrl) {
                infoHtml += `<p class="rss-url"><strong>Feed URL:</strong> <a href="${module.feedUrl}" target="_blank">${module.feedUrl}</a></p>`;
            }

            infoHtml += `</div>`;

            const info = $(infoHtml);
            showGlobalPopup(module.name, info);
        } else if (action === 'delete') {
            const moduleId = module.id;
            $thisModule.fadeOut(200, function () {
                $thisModule.remove();

                // Remove from selectedModules (if present)
                const selectedModules = JSON.parse(localStorage.getItem('selectedModules') || '[]');
                const updatedSelected = selectedModules.filter(id => id !== moduleId);
                localStorage.setItem('selectedModules', JSON.stringify(updatedSelected));

                // Remove from customModules (if applicable)
                const customModules = JSON.parse(localStorage.getItem('customModules') || '[]');
                const updatedCustoms = customModules.filter(m => m.id !== moduleId);
                localStorage.setItem('customModules', JSON.stringify(updatedCustoms));

                forceRebuildMasonry();
                saveWidgetStates();
            });
        } else if (action === 'move-top') {
            const $container = $('.container');
            const previousFirstId = $container.children('.module').first().attr('id');

            $thisModule.fadeOut(200, function () {
                $thisModule.prependTo($container).fadeIn(400);

                // Remove 'move-top' from this module's menu
                $thisModule.find('.module-menu .module-action[data-action="move-top"]').remove();

                // Add 'move-top' to the old first module if not already present
                const $oldFirst = $('#' + previousFirstId);
                const $oldMenu = $oldFirst.find('.module-menu');
                if ($oldMenu.length && $oldMenu.find('[data-action="move-top"]').length === 0) {
                    $('<div class="module-action" data-action="move-top"><i class="fa-solid fa-arrow-up"></i> Move to Top</div>')
                        .insertBefore($oldMenu.find('[data-action="info"]'));
                }

                forceRebuildMasonry();
                saveWidgetStates();
            });
        }
        $menu.removeClass('visible');
    });

    $modHead.append($menu);
    return $modHead;
}

function renderModule(module) {
    const moduleWidth = 350;
    let $moduleDiv = $('<div>').addClass('module').attr('id', module.id).css('width', moduleWidth);
    if (module.height) $moduleDiv.css('height', module.height);
    if (module.mode) $moduleDiv.addClass(module.mode);

    let $header = $('<div>').addClass('header');
    if (module.icon) $('<i>').addClass('icon').addClass(module.icon).appendTo($header);
    if (module.name) $(`<h2 class="title">${module.name}</h2>`).appendTo($header);

    let $modHeadBtns = createHeaderButtons(module);

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
                        forceRebuildMasonry();
                        saveWidgetStates();
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
        const $mod = $(this);
        states.push({
            id: $mod.attr('id'),
            minimized: $mod.hasClass('minimized'),
            order: $mod.index()
        });
    });
    localStorage.setItem('moduleStates', JSON.stringify(states));
}

function restoreWidgetStates() {
    const storedStates = localStorage.getItem('moduleStates');
    if (storedStates) {
        try {
            const states = JSON.parse(storedStates);
            states.sort((a, b) => a.order - b.order);
            states.forEach(state => {
                const $module = $('#' + state.id);
                if ($module.length) {
                    $module.toggleClass('minimized', state.minimized);
                    $('.container').append($module);
                }
            });
            forceRebuildMasonry();
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

    setTimeout(() => {
        refreshMasonryLayout();
    }, 50);
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
    window.onload = function () {
        const jsonUrl = 'modules.json';
        const $targetContainer = $('.container');
        const moduleWidth = 350; // Define your module width

        if (!$targetContainer.length) {
            console.error(`Error: Target container ".container" not found.`);
            return;
        }

        $.getJSON(jsonUrl)
            .done(function (data) {
                if (data && Array.isArray(data.modules)) {
                    const customModules = JSON.parse(localStorage.getItem('customModules') || '[]');
                    data.modules = [...customModules, ...data.modules];
                    const selectedModuleIds = JSON.parse(localStorage.getItem('selectedModules')) || [];
                    const modulesToShow = selectedModuleIds.length > 0
                        ? data.modules.filter(m => selectedModuleIds.includes(m.id) || m.contentType === 'rss')
                        : data.modules;

                    $targetContainer.children('.module').remove(); // Clear existing content before adding modules

                    const nonRssModules = [];
                    const rssModules = [];

                    modulesToShow.forEach(module => {
                        if (module.contentType === 'rss') {
                            rssModules.push(module);
                        } else {
                            nonRssModules.push(module);
                        }
                    });

                    // First load and render non-RSS modules
                    nonRssModules.forEach((module, index) => {
                        if (!module.noShow) {
                            const $skeleton = $('<div>')
                                .addClass('module skeleton-module')
                                .attr('id', `skeleton-${module.id}`)
                                .css({ width: moduleWidth, height: 350 })
                                .html(`
                                    <div class="header">
                                        <div class="skeleton-icon"></div>
                                        <h2 class="skeleton-title"></h2>
                                        <div class="modHeadBtns">
                                            <div class="modActions">
                                                <i class="header-icon"></i>
                                                <i class="header-icon"></i>
                                                <i class="header-icon"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="module-content module-content-standard">
                                        <ul class="rss-list">
                                            <li class="skeleton-line"></li>
                                            <li class="skeleton-line"></li>
                                            <li class="skeleton-line"></li>
                                        </ul>
                                    </div>
                                `);
                            $('.container').append($skeleton);
                            const $moduleDiv = renderModule(module);
                            $(`#skeleton-${module.id}`).replaceWith($moduleDiv);
                        }
                    });

                    // Then load and render RSS modules
                    rssModules.forEach(module => {
                        // Create a placeholder skeleton module
                        const $skeleton = $('<div>')
                            .addClass('module skeleton-module')
                            .attr('id', `skeleton-${module.id}`)
                            .css({ width: moduleWidth, height: 350 })
                            .html(`
                                <div class="header">
                                    <div class="icon skeleton-icon"></div>
                                    <h2 class="skeleton-title title"></h2>
                                    <div class="modHeadBtns">
                                        <div class="modActions">
                                            <i class="header-icon"></i>
                                            <i class="header-icon"></i>
                                            <i class="header-icon"></i>
                                        </div>
                                    </div>
                                </div>
                                <div class="module-content module-content-standard">
                                    <ul class="rss-list">
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                        <li class="skeleton-line"></li>
                                    </ul>
                                </div>
                            `);
                        $('.container').append($skeleton);

                        fetchRssFeed(module.feedUrl)
                            .then(rssData => {
                                const $rssModule = renderRssModule(module, rssData.items);
                                $(`#skeleton-${module.id}`).replaceWith($rssModule);
                                forceRebuildMasonry();
                                restoreWidgetStates();
                            })
                            .catch(err => {
                                const $errorModule = $('<div>').addClass('module').css('width', 350)
                                    .html(`<p>Error loading RSS: ${err.message}</p>`);
                                $('.container').append($errorModule);
                            });
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
                            const $modules = $('.container .module');
                            const $newFirst = $modules.first();

                            // Remove 'move-top' from the new first
                            $newFirst.find('.module-menu [data-action="move-top"]').remove();

                            // Ensure all other modules have the button
                            $modules.not($newFirst).each(function () {
                                const $menu = $(this).find('.module-menu');
                                if ($menu.find('[data-action="move-top"]').length === 0) {
                                    $('<div class="module-action" data-action="move-top"><i class="fa-solid fa-arrow-up"></i> Move to Top</div>')
                                        .insertBefore($menu.find('[data-action="info"]'));
                                }
                            });
                            $targetContainer.masonry('reloadItems').masonry('layout');
                            saveWidgetStates();
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

                    // Add persistent test skeleton module for styling/animation dev
                    // const $testSkeleton = $('<div>')
                    //     .addClass('module skeleton-module test-skeleton')
                    //     .attr('id', 'skeleton-test')
                    //     .css({ width: 350, height: 350 })
                    //     .html(`
                    //             <div class="header">
                    //                 <div class="icon skeleton-icon"></div>
                    //                 <h2 class="skeleton-title title"></h2>
                    //                 <div class="modHeadBtns">
                    //                     <div class="modActions">
                    //                         <i class="header-icon"></i>
                    //                         <i class="header-icon"></i>
                    //                         <i class="header-icon"></i>
                    //                     </div>
                    //                 </div>
                    //             </div>
                    //             <div class="module-content module-content-standard">
                    //                 <ul class="rss-list">
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                     <li class="skeleton-line"></li>
                    //                 </ul>
                    //             </div>
                    //     `);
                    // $targetContainer.append($testSkeleton);

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
    };
}

function openModuleSelector(modules) {
    const $popup = $('.module-selector-popup');
    const $rssButton = $('<button class="rss-add-btn">+ Add RSS Feed</button>').on('click', function () {
        showGlobalPopup('Add RSS Feed', createRssInputForm());
    });
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
                saveWidgetStates();
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
    $popup.append($filterContainer, $moduleList, $rssButton);

    $settings.addClass('visible');
}

function openSettingsWindow(modules) {
    addToTabTitle('Settings');
    $.getJSON('modules.json')
        .done(function (freshData) {
            openModuleSelector(freshData.modules);
        })
        .fail(function () {
            console.error('Failed to refresh modules before opening settings.');
            openModuleSelector(modules); // fallback to original
        });

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
    const version = document.querySelector('meta[name="version"]')?.getAttribute('content') || 'N/A';
    $('#aboutVersion').text(version);
    const totalModules = JSON.parse(localStorage.getItem('customModules') || '[]').length +
        (Array.isArray(modules) ? modules.length : 0);
    const loadedModules = JSON.parse(localStorage.getItem('moduleStates') || '[]').length;
    const rssModules = JSON.parse(localStorage.getItem('customModules') || '[]').length;
    $('#aboutModuleAdded').text(loadedModules);
    $('#aboutModuleRSS').text(rssModules);
    $('#aboutModuleTotal').text(totalModules);
    function detectBrowser() {
        const ua = navigator.userAgent;
        if (/Edg\//.test(ua)) return "Microsoft Edge";
        if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
        if (/Chromium/.test(ua)) return "Chromium";
        if (/Safari/.test(ua) && !/Chrome|Chromium/.test(ua)) return "Safari";
        if (/Firefox\//.test(ua)) return "Firefox";
        if (/OPR\//.test(ua)) return "Opera";
        return "Unknown";
    }
    $('#aboutBrowser').text(detectBrowser());
    $('#aboutPlatform').text(navigator.platform);
    const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unavailable';
    $('#aboutMemory').text(mem);

    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    $('#aboutViewport').text(`${vpWidth} × ${vpHeight}`);
}

function addToTabTitle(suffix) {
    const baseTitle = "Youie";
    if (suffix && typeof suffix === 'string' && suffix.trim() !== "") {
        document.title = `${baseTitle} - ${suffix}`;
    } else {
        document.title = baseTitle;
    }
}

function createRssInputForm() {
    const $form = $('<div class="rss-form">');
    $form.append('<p>Enter details manually:</p>');
    $form.append('<input type="text" class="rss-title" placeholder="Enter Title">');
    $form.append('<input type="url" class="rss-url" placeholder="Enter RSS Feed URL">');
    const $submit = $('<button>Add Feed</button>').on('click', async function () {
        const title = $form.find('.rss-title').val().trim();
        const url = $form.find('.rss-url').val().trim();

        if (!title || !url) {
            alert('Please enter both a title and RSS URL.');
            return;
        }

        try {
            const rssData = await fetchRssFeed(url);
            if (!rssData.items || rssData.items.length === 0) {
                alert('No RSS items found or invalid feed.');
                return;
            }

            const id = `rss-${btoa(feedUrl).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
            const module = {
                id,
                name: title,
                description: `RSS Feed: ${title}`,
                category: ['Custom', 'Web'],
                mode: 'internal',
                icon: 'fa-solid fa-rss',
                contentType: 'rss',
                feedUrl: url
            };

            const customModules = JSON.parse(localStorage.getItem('customModules') || '[]');
            customModules.push(module);
            localStorage.setItem('customModules', JSON.stringify(customModules));

            const $module = renderRssModule(module, rssData.items);
            $('.container').prepend($module);
            forceRebuildMasonry();
            $('#globalPopup').removeClass('visible');
        } catch (e) {
            console.error('Error loading RSS:', e);
            alert('Failed to load RSS feed.');
        }
        saveWidgetStates();
    });

    $form.append($submit);

    // Divider and starter feed section
    $form.append('<div class="sep">');
    $form.append('<p>Or choose an RSS feed to get you started:</p>');

    let $feedSelectForm = $('<div class="feedForm">');

    const starterFeeds = {
        "Yahoo News": "https://news.yahoo.com/rss/",
        "A Frugal Chick": "https://www.afrugalchick.com/feed/",
        "Pilot Online": "https://www.pilotonline.com/feed/",
        "HuffPost": "https://chaski.huffpost.com/us/auto/vertical/us-news",
        "BleepingComputer": "https://www.bleepingcomputer.com/feed/",
        "MakeUseOf": "https://www.makeuseof.com/feed/"
    };

    const $feedSelect = $('<select><option value="" hidden>-- Select a feed --</option></select>');
    Object.entries(starterFeeds).forEach(([label, url]) => {
        $feedSelect.append(`<option value="${url}">${label}</option>`);
    });

    const $starterBtn = $('<button disabled>Add to Modules</button>');

    $feedSelect.on('change', function () {
        $starterBtn.prop('disabled', !$(this).val());
    });

    $starterBtn.on('click', async function () {
        const feedUrl = $feedSelect.val();
        const title = $feedSelect.find('option:selected').text();

        try {
            const rssData = await fetchRssFeed(feedUrl);
            if (!rssData.items || rssData.items.length === 0) {
                alert('No RSS items found or invalid feed.');
                return;
            }

            const id = `rss-${btoa(feedUrl).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
            const module = {
                id,
                name: title,
                description: `RSS Feed: ${title}`,
                category: ['Custom', 'Web'],
                mode: 'internal',
                icon: 'fa-solid fa-rss',
                contentType: 'rss',
                feedUrl: feedUrl
            };

            const customModules = JSON.parse(localStorage.getItem('customModules') || '[]');
            customModules.push(module);
            localStorage.setItem('customModules', JSON.stringify(customModules));

            const $module = renderRssModule(module, rssData.items);
            $('.container').prepend($module);
            forceRebuildMasonry();
            $('#globalPopup').removeClass('visible');
        } catch (e) {
            console.error('Error loading starter RSS feed:', e);
            alert('Failed to load starter RSS feed.');
        }
        saveWidgetStates();
    });

    $feedSelectForm.append($feedSelect, $starterBtn);
    $form.append($feedSelectForm);
    $form.append('<a href="https://getrssfeed.com/" target="_blank">Need some help?</a>');

    return $form;
}

async function fetchRssFeed(url) {
    try {
        // Force using AllOrigins + raw XML parser
        throw new Error("Force fallback to test AllOrigins XML parsing");
    } catch (err) {
        // Fallback using AllOrigins proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const fallbackResponse = await fetch(proxyUrl);
        if (!fallbackResponse.ok) throw new Error('Failed to fetch RSS feed via AllOrigins');
        const text = await fallbackResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        let lastItemEnd = 0;

        const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => {
            let thumbnail = "";

            // 1. Try any media:content tag with a "url" attribute
            const mediaContents = item.getElementsByTagName("media:content");
            for (let el of mediaContents) {
                if (!thumbnail && el.getAttribute("url")) {
                    thumbnail = el.getAttribute("url");
                    break;
                }
            }

            // 2. Fallback to media:thumbnail
            if (!thumbnail) {
                const thumbEl = item.querySelector("media\\:thumbnail");
                if (thumbEl) {
                    thumbnail = thumbEl.getAttribute("url") || "";
                }
            }

            // 3. enclosure
            if (!thumbnail) {
                const enclosure = item.querySelector("enclosure");
                if (enclosure && enclosure.getAttribute("type") === "image/jpeg") {
                    thumbnail = enclosure.getAttribute("url") || "";
                }
            }

            // 4. <content:encoded> block
            if (!thumbnail) {
                let contentEncoded = "";
                const contentNodes = item.getElementsByTagName("content:encoded");
                if (contentNodes.length && contentNodes[0].childNodes.length) {
                    contentEncoded = contentNodes[0].childNodes[0].nodeValue || "";
                }
                try {
                    const htmlDoc = new DOMParser().parseFromString(contentEncoded, "text/html");
                    const imgEl = htmlDoc.querySelector("img");
                    if (imgEl && imgEl.getAttribute("src")) {
                        thumbnail = imgEl.getAttribute("src");
                    }
                } catch (e) {
                    console.warn("Could not parse content:encoded HTML:", e);
                }
            }

            // 5. description fallback
            if (!thumbnail) {
                const desc = item.querySelector("description")?.textContent || "";
                const descImgMatch = desc.match(/<img[^>]+src="([^">]+)"/i);
                if (descImgMatch && descImgMatch[1]) {
                    thumbnail = descImgMatch[1];
                }
            }

            const rawItemStart = text.indexOf("<item", lastItemEnd);
            const rawItemEnd = text.indexOf("</item>", rawItemStart) + 7;
            const rawItem = text.substring(rawItemStart, rawItemEnd);
            lastItemEnd = rawItemEnd;

            const sourceEl = item.getElementsByTagName("source")[0];
            const authorFromSource = sourceEl?.firstChild?.nodeValue?.trim();

            const fallbackAuthor = item.querySelector("author")?.textContent ||
                item.querySelector("creator")?.textContent ||
                item.querySelector("media\\:credit")?.textContent || "";

            return {
                title: item.querySelector("title")?.textContent || "Untitled",
                link: item.querySelector("link")?.textContent || "#",
                pubDate: item.querySelector("pubDate")?.textContent || "",
                author: authorFromSource || fallbackAuthor,
                description: item.querySelector("description")?.textContent || "",
                thumbnail
            };
        });

        return { items };
    }
}

function renderRssModule(module, items) {
    const $moduleDiv = $('<div>').addClass('module').addClass('rss-module').attr('id', module.id).css('height', 350);
    const $header = $('<div>').addClass('header');
    $('<i>').addClass('icon').addClass(module.icon).appendTo($header);
    $(`<h2 class="title">${module.name}</h2>`).appendTo($header);
    $header.append(createHeaderButtons(module));
    $moduleDiv.append($header);

    const $content = $('<div class="module-content module-content-standard">');
    const $list = $('<ul class="rss-list">');
    const $detail = $(`
      <div class="rss-detail">
          <div class="rss-detail-header">
              <button class="rss-back-btn">← Back</button>
              <a class="rss-full-link" href="#" target="_blank">Read Full Article</a>
          </div>
          <div class="rss-detail-content"></div>
      </div>
  `);

    $detail.find('.rss-back-btn').on('click', function () {
        $detail.removeClass('visible');
    });

    items.forEach(item => {
        const $li = $('<li>').text(item.title).attr('title', item.title).on('click', function () {
            const date = item.pubDate
                ? new Date(item.pubDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : '';
            const author = item.author || '';

            $detail.find('.rss-detail-content').html(`
                <div class="rss-meta">
                    ${author ? `<span class="rss-author">${author}</span>` : ''}
                    <h3 class="article-title">${item.title}</h3>
                    ${date ? `<span class="rss-date">${date}</span>` : ''}
                </div>
                <img class="rss-image" src="${item.thumbnail}" alt="" style="max-width:100%;">
                <div class="article-body">${item.description}</div>
            `);
            $detail.find('.rss-full-link').attr('href', item.link);
            $detail.addClass('visible');
        });
        $list.append($li);
    });

    $content.append($list, $detail);
    $moduleDiv.append($content);
    return $moduleDiv;
}