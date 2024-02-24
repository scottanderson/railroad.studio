import {createFilter} from './Filter';
import {calculateSteepestGrade} from './Grade';
import {GvasString, GvasText, gvasToString} from './Gvas';
import {createPager} from './Pager';
import {Frame, NumericFrameState, Railroad, SplineType, Quadruplet} from './Railroad';
import {MapLayers, RailroadMap} from './RailroadMap';
import {Rotator} from './Rotator';
import {
    InputTextOptions,
    bootstrapIcon,
    editDropdown,
    editIndustryName,
    editIndustryProducts,
    editIndustryType,
    editNumber,
    editQuaternion,
    editRotator,
    editSlider,
    editString,
    editText,
    editTrackType,
    editVector,
} from './StudioEditor';
import {Vector} from './Vector';
import {simplifySplines} from './splines';
import {gvasToBlob, railroadToGvas} from './exporter';
import {
    CargoType,
    cargoLimits,
    cargoTypes,
    frameCategories,
    frameDefinitions,
    frameStateMetadata,
    hasCargoLimits,
    isCargoType,
    isFrameType,
} from './frames';
import {SplineTrackType} from './SplineTrackType';
import {hermiteToBezier, cubicBezierMinRadius} from './util-bezier';
import {handleError} from './index';
import {clamp} from './math';
import {toggleDarkMode} from './themes';
import {catmullRomToHermite} from './util-catmullrom';
import {Quaternion} from './Quaternion';
import {textToString} from './util';
import {
    IndustryName,
    IndustryType,
    getIndustryName,
    industryInputLabels,
    industryOutputLabels,
    isIndustryName,
} from './industries';
import {VegetationUtil} from './VegetationUtil';

const OLDEST_TESTED_SAVE_GAME_VERSION = 1;
const NEWEST_TESTED_SAVE_GAME_VERSION = 231117;

/**
 * Web UI for editing a Railroad object.
 */
export class Studio {
    private modified: boolean;
    private readonly btnDownload: HTMLButtonElement;
    private readonly filename: string;
    private readonly header: HTMLHeadingElement;
    private readonly map: RailroadMap;
    private readonly originalSegmentCount: number;
    readonly railroad: Railroad;
    private readonly vegetationUtil: VegetationUtil;

    constructor(filename: string, railroad: Railroad, headerElement: HTMLElement, content: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
        this.originalSegmentCount = this.railroad.splines.reduce((a, s) => a + s.segmentsVisible.length, 0);
        this.modified = false;
        this.vegetationUtil = new VegetationUtil(this);
        this.logRadiusGrade();
        // Set up the DOM
        const header = document.createElement('h2');
        this.header = header;
        header.textContent = 'Loaded ' + this.filename;
        const buttons = document.createElement('div');
        buttons.classList.add('hstack', 'gap-2');
        // Map
        const btnMap = document.createElement('button');
        btnMap.textContent = 'Map';
        btnMap.classList.add('btn', 'btn-secondary');
        const mapDiv = document.createElement('div');
        btnMap.addEventListener('click', () => {
            studioControls.replaceChildren(buttons, mapButtons);
            content.replaceChildren(mapDiv);
            this.setTitle('Map');
            this.floatHeader(true);
        });
        content.replaceChildren(mapDiv);
        this.map = new RailroadMap(this, mapDiv);
        // Layers dropdown
        const txtLayers = document.createTextNode(' Layers ');
        const imgLayers = bootstrapIcon('bi-layers', 'Layers Dropdown');
        const btnLayers = document.createElement('button');
        btnLayers.id = 'btnLayers';
        btnLayers.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnLayers.setAttribute('aria-expanded', 'false');
        btnLayers.setAttribute('data-bs-auto-close', 'outside');
        btnLayers.setAttribute('data-bs-toggle', 'dropdown');
        btnLayers.replaceChildren(imgLayers, txtLayers);
        btnLayers.addEventListener('click', () => {
            // Update layer toggle state
            layers.forEach((l) => l.listener ? l.listener() : undefined);
        });
        const lstLayers = document.createElement('ul');
        lstLayers.classList.add('dropdown-menu');
        const grpLayers = document.createElement('div');
        grpLayers.setAttribute('aria-labelledby', btnLayers.id);
        grpLayers.classList.add('dropdown');
        grpLayers.replaceChildren(btnLayers, lstLayers);
        let layers: {
            key: keyof MapLayers;
            name: string;
            listener?: () => void;
        }[] = [
            {
                key: 'border',
                name: 'World Border',
            },
            {
                key: 'background',
                name: 'Topographical Map',
            },
            {
                key: 'controlPoints',
                name: 'Control Points',
            },
            {
                key: 'frames',
                name: 'Frames',
            },
            {
                key: 'grades',
                name: 'Grade %',
            },
            {
                key: 'radius',
                name: 'Curve radius',
            },
            {
                key: 'radiusSwitch',
                name: 'Switch turnout radius',
            },
            {
                key: 'bridges',
                name: 'Bridges and Walls',
            },
            {
                key: 'groundworks',
                name: 'Fill',
            },
            {
                key: 'groundworksHidden',
                name: 'Groundwork and Bridge Hidden Segments',
            },
            {
                key: 'props',
                name: 'Props',
            },
            {
                key: 'industries',
                name: 'Industries',
            },
            {
                key: 'gizmo',
                name: 'Industry measurement tool',
            },
            {
                key: 'players',
                name: 'Players',
            },
            {
                key: 'tracks',
                name: 'Tracks',
            },
            {
                key: 'tracksHidden',
                name: 'Track Hidden Segments',
            },
            {
                key: 'trees',
                name: 'Trees',
            },
            {
                key: 'turntables',
                name: 'Turntables',
            },
        ];
        // Hide layers that don't apply to the current map
        const hasFrames = railroad.frames.length > 0;
        const hasIndustries = railroad.industries.length > 0;
        const hasPlayers = railroad.players.length > 0;
        const hasProps = railroad.props.length > 0;
        const hasSplineTracks = railroad.splineTracks.length > 0;
        const hasSplines = railroad.splines.length > 0;
        const hasTurntables = railroad.turntables.length > 0;
        if (!hasFrames) {
            layers = layers.filter((layer) => layer.key !== 'frames');
        }
        if (this.railroad.settings.gameLevelName !== null) {
            layers = layers.filter((layer) => layer.key !== 'trees');
        }
        if (!hasIndustries) {
            // Hide layers that only apply to industries
            layers = layers.filter((layer) => {
                switch (layer.key) {
                    case 'industries':
                    case 'gizmo':
                        return false;
                }
                return true;
            });
        }
        if (!hasPlayers) {
            layers = layers.filter((layer) => layer.key !== 'players');
        }
        if (!hasProps) {
            layers = layers.filter((layer) => layer.key !== 'props');
        }
        if (!hasSplines) {
            // Hide layers that only apply to old splines
            layers = layers.filter((layer) => {
                switch (layer.key) {
                    case 'groundworksHidden':
                    case 'tracksHidden':
                        return false;
                }
                return true;
            });
        }
        if (!hasSplineTracks) {
            // Hide layers that only apply to new splines
            layers = layers.filter((layer) => {
                switch (layer.key) {
                    case 'radiusSwitch':
                    case 'groundworksHidden':
                    case 'tracksHidden':
                        return false;
                }
                return true;
            });
        }
        if (!hasSplines && !hasSplineTracks) {
            // Hide layers that only apply to splines
            layers = layers.filter((layer) => {
                switch (layer.key) {
                    case 'controlPoints':
                    case 'grades':
                    case 'radius':
                    case 'bridges':
                    case 'groundworks':
                    case 'tracks':
                        return false;
                }
                return true;
            });
        }
        if (!hasTurntables) {
            // Hide layers that only apply to turntables
            layers = layers.filter((layer) => layer.key !== 'turntables');
        }
        lstLayers.replaceChildren(...layers.map((layer) => {
            const btnToggleLayer = document.createElement('button');
            const imgToggleLayer = document.createElement('i');
            const txtToggleLayer = document.createTextNode(` ${layer.name} `);
            imgToggleLayer.classList.add('bi', 'bi-toggle-off');
            btnToggleLayer.classList.add('dropdown-item', 'text-nowrap');
            btnToggleLayer.replaceChildren(imgToggleLayer, txtToggleLayer);
            layer.listener = () => {
                if (this.map.getLayerVisibility(layer.key)) {
                    imgToggleLayer.classList.replace('bi-toggle-off', 'bi-toggle-on');
                } else {
                    imgToggleLayer.classList.replace('bi-toggle-on', 'bi-toggle-off');
                }
            };
            btnToggleLayer.addEventListener('click', () => {
                this.map.toggleLayerVisibility(layer.key);
                if (layer.listener) {
                    layer.listener();
                }
            });
            return btnToggleLayer;
        }));
        // Find rolling stock dropdown
        const txtFrameList = document.createTextNode(' Frames ');
        const imgFrameList = bootstrapIcon('bi-car-front-fill', 'Find rolling stock');
        const btnFrameList = document.createElement('button');
        btnFrameList.id = 'btnFrameList';
        btnFrameList.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnFrameList.setAttribute('aria-expanded', 'false');
        btnFrameList.setAttribute('data-bs-auto-close', 'outside');
        btnFrameList.setAttribute('data-bs-toggle', 'dropdown');
        btnFrameList.replaceChildren(imgFrameList, txtFrameList);
        const lstFrameList = document.createElement('ul');
        lstFrameList.classList.add('dropdown-menu');
        lstFrameList.style.maxHeight = '50rem';
        lstFrameList.style.overflowY = 'auto';
        const grpFrameList = document.createElement('div');
        grpFrameList.setAttribute('aria-labelledby', btnFrameList.id);
        grpFrameList.classList.add('dropdown');
        grpFrameList.replaceChildren(btnFrameList, lstFrameList);
        lstFrameList.replaceChildren(...railroad.frames.slice().sort((a, b) => {
            if (!isFrameType(a.type)) return isFrameType(b.type) ? 1 : 0;
            if (!isFrameType(b.type)) return -1;
            const ad = frameDefinitions[a.type];
            const bd = frameDefinitions[b.type];
            return frameCategories.reduceRight((p, c) => ad[c] === bd[c] ? p : ad[c] ? -1 : 1, 0);
        }).flatMap((frame, i, a) => {
            const btnFrame = document.createElement('button');
            const imgFrame = document.createElement('i');
            const text =
                (isFrameType(frame.type) ? frameDefinitions[frame.type].name + ' ' : '') +
                (frame.number ? '#' + gvasToString(textToString(frame.number)) + ' ' : '') +
                (frame.name ? gvasToString(textToString(frame.name)) : '');
            const txtFrame = document.createTextNode(` ${text} `);
            imgFrame.classList.add('bi', 'bi-geo');
            btnFrame.classList.add('dropdown-item', 'text-nowrap');
            btnFrame.replaceChildren(imgFrame, txtFrame);
            btnFrame.addEventListener('click', () => {
                // Center vewport on frame location
                this.map.panTo(frame.location);
                // Show frames
                if (!this.map.getLayerVisibility('frames')) this.map.toggleLayerVisibility('frames');
            });
            const prevFrame = i > 0 ? a[i - 1] : undefined;
            if (prevFrame && isFrameType(frame.type) && isFrameType(prevFrame.type)) {
                const prevFrameDef = frameDefinitions[prevFrame.type];
                const frameDef = frameDefinitions[frame.type];
                if (frameCategories.some((key) => prevFrameDef[key] !== frameDef[key])) {
                    const li = document.createElement('li');
                    const hr = document.createElement('hr');
                    hr.classList.add('dropdown-divider');
                    li.appendChild(hr);
                    return [li, btnFrame];
                }
            }
            return btnFrame;
        }));
        // Trees dropdown
        const txtTrees = document.createTextNode(' Trees ');
        const imgTrees = bootstrapIcon('bi-tree', 'Trees Dropdown');
        const btnTrees = document.createElement('button');
        btnTrees.id = 'btnTrees';
        btnTrees.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnTrees.setAttribute('aria-expanded', 'false');
        btnTrees.setAttribute('data-bs-auto-close', 'true');
        btnTrees.setAttribute('data-bs-toggle', 'dropdown');
        btnTrees.replaceChildren(imgTrees, txtTrees);
        const lstTrees = document.createElement('ul');
        lstTrees.classList.add('dropdown-menu');
        const grpTrees = document.createElement('div');
        grpTrees.setAttribute('aria-labelledby', btnTrees.id);
        grpTrees.classList.add('dropdown');
        grpTrees.replaceChildren(btnTrees, lstTrees);
        const treeActions: {
            name: string;
            onClick: () => void;
        }[] = [
            {
                name: 'Cut All Trees (increases save file size)',
                onClick: () => this.map.getTreeUtil().cutAll().catch(handleError),
            },
            {
                name: 'Plant all trees (dangerous!)',
                onClick: () => this.map.getTreeUtil().plantAll().catch(handleError),
            },
            {
                name: 'Smart plant trees',
                onClick: () => this.map.getTreeUtil().smartPlant().catch(handleError),
            },
            {
                name: 'Smart cut trees (preview)',
                onClick: () => this.map.previewSmartPlant().catch(handleError),
            },
            {
                name: 'Smart cut trees',
                onClick: () => this.map.getTreeUtil().smartCut().catch(handleError),
            },
        ];
        lstTrees.replaceChildren(...treeActions.map((action) => {
            const btnAction = document.createElement('button');
            const txtAction = document.createTextNode(` ${action.name} `);
            btnAction.classList.add('dropdown-item', 'text-nowrap');
            btnAction.replaceChildren(txtAction);
            btnAction.addEventListener('click', action.onClick);
            return btnAction;
        }));
        // Tree brush
        const btnTreeBrush = document.createElement('button');
        const imgTreeBrush = bootstrapIcon('bi-tree-fill', 'Tree Brush');
        const txtTreeBrush = document.createTextNode(' Tree Brush ');
        btnTreeBrush.classList.add('btn', 'btn-secondary');
        btnTreeBrush.replaceChildren(imgTreeBrush, txtTreeBrush);
        btnTreeBrush.setAttribute('data-bs-toggle', 'tooltip');
        btnTreeBrush.title = '[LMB] Plant trees\n[RMB] Cut trees\n[MMB] Pan\n[Scroll wheel] Change brush size';
        btnTreeBrush.addEventListener('click', () => {
            const toolEnabled = this.map.toggleTreeBrush();
            if (toolEnabled) {
                btnTreeBrush.classList.add('active', 'btn-danger');
                btnTreeBrush.classList.remove('btn-secondary');
            } else {
                btnTreeBrush.classList.remove('active', 'btn-danger');
                btnTreeBrush.classList.add('btn-secondary');
            }
        });
        // Vegetation dropdown
        const txtVegetation = document.createTextNode(' Vegetation ');
        const imgVegetation = bootstrapIcon('bi-tree', 'Vegetation Dropdown');
        const btnVegetation = document.createElement('button');
        btnVegetation.id = 'btnVegetation';
        btnVegetation.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnVegetation.setAttribute('aria-expanded', 'false');
        btnVegetation.setAttribute('data-bs-auto-close', 'true');
        btnVegetation.setAttribute('data-bs-toggle', 'dropdown');
        btnVegetation.replaceChildren(imgVegetation, txtVegetation);
        const lstVegetation = document.createElement('ul');
        lstVegetation.classList.add('dropdown-menu');
        const grpVegetation = document.createElement('div');
        grpVegetation.setAttribute('aria-labelledby', btnVegetation.id);
        grpVegetation.classList.add('dropdown');
        grpVegetation.replaceChildren(btnVegetation, lstVegetation);
        const vegetationActions: {
            name: string;
            onClick: () => void;
        }[] = [
            {
                name: 'Plant all vegetation',
                onClick: () => this.vegetationUtil.plantAll().then(() => {
                    if (!this.railroad.settings.gameLevelName) {
                        // Enable legacy tree tools based on railroad.removedVegetationAssets
                        grpVegetation.replaceWith(grpTrees, btnTreeBrush);
                    }
                }),
            },
        ];
        lstVegetation.replaceChildren(...vegetationActions.map((action) => {
            const btnAction = document.createElement('button');
            const txtAction = document.createTextNode(` ${action.name} `);
            btnAction.classList.add('dropdown-item', 'text-nowrap');
            btnAction.replaceChildren(txtAction);
            btnAction.addEventListener('click', action.onClick);
            return btnAction;
        }));
        // Rerail frame tool
        const btnRerail = document.createElement('button');
        const imgRerail = bootstrapIcon('bi-train-front', 'Rerail Frame Tool');
        const txtRerail = document.createTextNode(' Rerail ');
        btnRerail.classList.add('btn', 'btn-secondary');
        btnRerail.replaceChildren(imgRerail, txtRerail);
        btnRerail.addEventListener('click', () => {
            const toolEnabled = this.map.toggleRerailTool();
            if (toolEnabled) {
                btnRerail.classList.add('active', 'btn-danger');
                btnRerail.classList.remove('btn-secondary');
            } else {
                btnRerail.classList.remove('active', 'btn-danger');
                btnRerail.classList.add('btn-secondary');
            }
        });
        // Duplicate frame tool
        const btnDuplicate = document.createElement('button');
        const imgDuplicate = bootstrapIcon('bi-copy', 'Duplicate Frame Tool');
        const txtDuplicate = document.createTextNode(' Duplicate ');
        btnDuplicate.classList.add('btn', 'btn-secondary');
        btnDuplicate.replaceChildren(imgDuplicate, txtDuplicate);
        btnDuplicate.addEventListener('click', () => {
            const toolEnabled = this.map.toggleDuplicateTool();
            if (toolEnabled) {
                btnDuplicate.classList.add('active', 'btn-danger');
                btnDuplicate.classList.remove('btn-secondary');
            } else {
                btnDuplicate.classList.remove('active', 'btn-danger');
                btnDuplicate.classList.add('btn-secondary');
            }
        });
        // Measure frame tool
        const btnMeasure = document.createElement('button');
        const imgMeasure = bootstrapIcon('bi-rulers', 'Measure Frame Tool');
        const txtMeasure = document.createTextNode(' Measure ');
        btnMeasure.classList.add('btn', 'btn-secondary');
        btnMeasure.replaceChildren(imgMeasure, txtMeasure);
        btnMeasure.addEventListener('click', () => {
            const toolEnabled = this.map.toggleMeasureTool();
            if (toolEnabled) {
                btnMeasure.classList.add('active', 'btn-danger');
                btnMeasure.classList.remove('btn-secondary');
            } else {
                btnMeasure.classList.remove('active', 'btn-danger');
                btnMeasure.classList.add('btn-secondary');
            }
        });
        // Delete tool
        const btnDelete = document.createElement('button');
        const imgDelete = bootstrapIcon('bi-eraser-fill', 'Delete Tool');
        const txtDelete = document.createTextNode(' Delete ');
        btnDelete.classList.add('btn', 'btn-secondary');
        btnDelete.replaceChildren(imgDelete, txtDelete);
        btnDelete.addEventListener('click', () => {
            const toolEnabled = this.map.toggleDeleteTool();
            if (toolEnabled) {
                btnDelete.classList.add('active', 'btn-danger');
                btnDelete.classList.remove('btn-secondary');
            } else {
                btnDelete.classList.remove('active', 'btn-danger');
                btnDelete.classList.add('btn-secondary');
            }
        });
        // Flatten spline tool
        const btnFlattenSpline = document.createElement('button');
        const imgFlattenSpline = bootstrapIcon('bi-arrows-collapse', 'Flatten Spline Tool');
        const txtFlattenSpline = document.createTextNode(' Flatten ');
        btnFlattenSpline.classList.add('btn', 'btn-secondary');
        btnFlattenSpline.replaceChildren(imgFlattenSpline, txtFlattenSpline);
        btnFlattenSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleFlattenTool();
            if (toolEnabled) {
                btnFlattenSpline.classList.add('active', 'btn-danger');
                btnFlattenSpline.classList.remove('btn-secondary');
            } else {
                btnFlattenSpline.classList.remove('active', 'btn-danger');
                btnFlattenSpline.classList.add('btn-secondary');
            }
        });
        // Parallel spline tool
        const btnParallelSpline = document.createElement('button');
        const imgParallelSpline = bootstrapIcon('bi-distribute-horizontal', 'Parallel Spline Tool');
        const txtParallelSpline = document.createTextNode(' Parallel ');
        btnParallelSpline.classList.add('btn', 'btn-secondary');
        btnParallelSpline.replaceChildren(imgParallelSpline, txtParallelSpline);
        btnParallelSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleParallelTool();
            if (toolEnabled) {
                btnParallelSpline.classList.add('active', 'btn-danger');
                btnParallelSpline.classList.remove('btn-secondary');
            } else {
                btnParallelSpline.classList.remove('active', 'btn-danger');
                btnParallelSpline.classList.add('btn-secondary');
            }
        });
        // Circularize spline tool
        const btnCircularizeSpline = document.createElement('button');
        const imgCircularizeSpline = bootstrapIcon('bi-rainbow', 'Circularize Spline Tool');
        const txtCircularizeSpline = document.createTextNode(' Circularize ');
        btnCircularizeSpline.classList.add('btn', 'btn-secondary');
        btnCircularizeSpline.replaceChildren(imgCircularizeSpline, txtCircularizeSpline);
        btnCircularizeSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleCircularizeTool();
            if (toolEnabled) {
                btnCircularizeSpline.classList.add('active', 'btn-danger');
                btnCircularizeSpline.classList.remove('btn-secondary');
            } else {
                btnCircularizeSpline.classList.remove('active', 'btn-danger');
                btnCircularizeSpline.classList.add('btn-secondary');
            }
        });
        // Minimize segment count
        const btnMinimizeSegments = document.createElement('button');
        const imgMinimizeSegments = bootstrapIcon('bi-binoculars', 'Minimize segment count');
        const txtMinimizeSegments = document.createTextNode(' Minimize segment count ');
        btnMinimizeSegments.classList.add('btn', 'btn-secondary');
        btnMinimizeSegments.replaceChildren(imgMinimizeSegments, txtMinimizeSegments);
        const fmtPercent = (n: number, d: number) => {
            if (n === d) return `unchanged (${n})`;
            const pct = Math.abs(100 * (1 - (n / d))).toFixed(2);
            return (n > d) ? `increased from ${d} to ${n} (+${pct}%)` : `decreased from ${d} to ${n} (-${pct}%)`;
        };
        btnMinimizeSegments.addEventListener('click', () => {
            this.railroad.splines = simplifySplines(this.railroad, this.map.getMergeLimits());
            const segmentCountAfter = this.railroad.splines.reduce((a, s) => a + s.segmentsVisible.length, 0);
            if (segmentCountAfter > this.originalSegmentCount) {
                btnMinimizeSegments.classList.replace('btn-secondary', 'btn-danger');
            } else if (segmentCountAfter < this.originalSegmentCount) {
                this.setTitle(`Segment count ${fmtPercent(segmentCountAfter, this.originalSegmentCount)}`);
                btnMinimizeSegments.classList.replace('btn-secondary', 'btn-success');
            }
            this.setMapModified(true);
            this.map.refreshSplines().then(() => {
                if (segmentCountAfter < this.originalSegmentCount) {
                    this.setTitle(`Segment count ${fmtPercent(segmentCountAfter, this.originalSegmentCount)}`);
                }
            });
        });
        // Minimize segment count configuration dropdown
        const grpMinimizeSegments = document.createElement('div');
        {
            const drpMinimizeSegments = document.createElement('button');
            drpMinimizeSegments.classList.add('btn', 'btn-secondary', 'dropdown-toggle', 'dropdown-toggle-split');
            drpMinimizeSegments.setAttribute('aria-expanded', 'false');
            drpMinimizeSegments.setAttribute('data-bs-auto-close', 'outside');
            drpMinimizeSegments.setAttribute('data-bs-toggle', 'dropdown');
            const makeInput = (id: string, type: string, value: string, cb: (ev: Event) => unknown) => {
                const cfgInput = document.createElement('input');
                cfgInput.id = id;
                cfgInput.min = '0';
                cfgInput.step = 'any';
                cfgInput.type = type;
                cfgInput.classList.add('form-control');
                cfgInput.value = value;
                cfgInput.addEventListener('input', cb);
                return cfgInput;
            };
            const inputBearing = makeInput(
                'inputBearing',
                'number',
                String(this.map.getMergeLimits().bearing),
                (ev) => {
                    this.map.getMergeLimits().bearing = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const inputInclination = makeInput(
                'inputInclination',
                'number',
                String(this.map.getMergeLimits().inclination),
                (ev) => {
                    this.map.getMergeLimits().inclination = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const inputHorizontal = makeInput(
                'inputHorizontal',
                'number',
                String(this.map.getMergeLimits().horizontal),
                (ev) => {
                    this.map.getMergeLimits().horizontal = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const inputVertical = makeInput(
                'inputVertical',
                'number',
                String(this.map.getMergeLimits().vertical),
                (ev) => {
                    this.map.getMergeLimits().vertical = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const btnDefaults = document.createElement('button');
            btnDefaults.type = 'button';
            btnDefaults.classList.add('btn', 'btn-warning');
            btnDefaults.textContent = 'Load defaults';
            btnDefaults.addEventListener('click', () => {
                inputBearing.value = '10';
                inputInclination.value = '2.5';
                inputHorizontal.value = '10';
                inputVertical.value = '1';
            });
            const wrapInput = (cfgInput: HTMLInputElement, label: string, text: string) => {
                const cfgLabel = document.createElement('label');
                cfgLabel.setAttribute('for', cfgInput.id);
                cfgLabel.classList.add('form-label');
                cfgLabel.textContent = label;
                const cfgText = document.createElement('div');
                cfgText.classList.add('form-text');
                cfgText.textContent = text;
                const frmDivOne = document.createElement('div');
                frmDivOne.classList.add('mb-3');
                frmDivOne.replaceChildren(cfgLabel, cfgInput, cfgText);
                return frmDivOne;
            };
            const frmMinimizeSegments = document.createElement('form');
            frmMinimizeSegments.classList.add('px-4', 'py-3');
            frmMinimizeSegments.replaceChildren(
                wrapInput(inputBearing, 'Bearing limit',
                    'Maximum difference between segment headings for spline merging, in degrees.'),
                wrapInput(inputInclination, 'Inclination limit',
                    'Maximum difference between segment inclinations for spline merging, in degrees.'),
                wrapInput(inputHorizontal, 'Horizontal limit',
                    'Maximum distance between control points for spline merging, in centimeters.'),
                wrapInput(inputVertical, 'Vertical limit',
                    'Maximum distance between control points for spline merging, in centimeters.'),
                btnDefaults,
            );
            const mnuMinimizeSegments = document.createElement('div');
            mnuMinimizeSegments.classList.add('dropdown-menu', 'dropdown-menu-end');
            mnuMinimizeSegments.replaceChildren(frmMinimizeSegments);
            grpMinimizeSegments.classList.add('btn-group');
            grpMinimizeSegments.replaceChildren(btnMinimizeSegments, drpMinimizeSegments, mnuMinimizeSegments);
        }
        // Map toolbar
        const mapButtons = document.createElement('div');
        mapButtons.classList.add('hstack', 'gap-2');
        mapButtons.replaceChildren(
            grpLayers,
            btnDelete,
        );
        if (hasFrames) {
            // Enable tools that work on frames
            [
                grpFrameList,
                btnRerail,
                btnDuplicate,
                btnMeasure,
            ].forEach((e) => mapButtons.insertBefore(e, btnDelete));
        }
        if (!this.railroad.settings.gameLevelName && this.railroad.vegetation.length === 0) {
            // Enable legacy tree tools based on railroad.removedVegetationAssets
            [
                grpTrees,
                btnTreeBrush,
            ].forEach((e) => mapButtons.insertBefore(e, btnDelete));
        } else {
            // Enable vegetation tools based on railroad.vegetation
            [
                grpVegetation,
            ].forEach((e) => mapButtons.insertBefore(e, btnDelete));
        }
        if (hasSplines) {
            // Enable tools that only work for old splines
            [
                btnFlattenSpline,
                grpMinimizeSegments,
            ].forEach((e) => mapButtons.appendChild(e));
        }
        if (hasSplineTracks) {
            // Enable tools that only work for new splines
            [
                btnCircularizeSpline,
            ].forEach((e) => mapButtons.appendChild(e));
        }
        if (hasSplines || hasSplineTracks) {
            // Enable tools that work for any splines
            [
                btnParallelSpline,
            ].forEach((e) => mapButtons.appendChild(e));
        }
        // Frames
        const btnFrames = document.createElement('button');
        btnFrames.textContent = 'Frames';
        btnFrames.classList.add('btn', 'btn-secondary');
        let framePage = 0;
        const onFramePage = (page: number) => {
            framePage = page;
            resetFramePage();
        };
        const frameInCategory = (f: Frame, c: typeof frameCategories[number]) =>
            isFrameType(f.type) && (frameDefinitions[f.type][c] ?? false);
        const labels = {
            engine: `Engines (${railroad.frames.filter((f) => frameInCategory(f, 'engine')).length})`,
            tender: `Tenders (${railroad.frames.filter((f) => frameInCategory(f, 'tender')).length})`,
            handcar: `Handcars (${railroad.frames.filter((f) => frameInCategory(f, 'handcar')).length})`,
            freight: `Freight (${railroad.frames.filter((f) => frameInCategory(f, 'freight')).length})`,
            passenger: `Passenger (${railroad.frames.filter((f) => frameInCategory(f, 'passenger')).length})`,
            mow: `Maintenance (${railroad.frames.filter((f) => frameInCategory(f, 'mow')).length})`,
        };
        const anyInCategory = (c: typeof frameCategories[number]): boolean =>
            railroad.frames.some((f) => frameInCategory(f, c));
        const checked = Object.fromEntries(frameCategories.map((c) => [c, anyInCategory(c)]));
        const onFrameFilter = (category: typeof frameCategories[number], value: boolean): void => {
            checked[category] = value;
            resetFramePage();
        };
        const categories = frameCategories.filter(anyInCategory);
        let frameSelect = 'all';
        const onOption = (value: string) => {
            frameSelect = value;
            resetFramePage();
        };
        const options = Object.entries(frameDefinitions)
            .filter(([type]) => railroad.frames.some((f) => f.type === type))
            .map(([type, fd]) => {
                const count = railroad.frames.filter((f) => f.type === type).length;
                const text = count === 1 ? fd.name : `${fd.name} (${count})`;
                return [type, text] as [string, string];
            });
        options.unshift(['all', 'All']);
        const filterNav = createFilter(categories, labels, onFrameFilter, options, onOption);
        filterNav.classList.add('mt-5');
        const resetFramePage = () => {
            const pageSize = 20;
            const filtered = railroad.frames.filter((f) => {
                if (!isFrameType(f.type)) return false;
                if (frameSelect && frameSelect !== 'all') return (f.type === frameSelect);
                const d = frameDefinitions[f.type];
                return frameCategories.every((c) => !d[c] || checked[c]);
            });
            const numPages = Math.ceil(filtered.length / pageSize);
            framePage = clamp(framePage, 0, numPages - 1);
            const framesNav = createPager(framePage, filtered.length, onFramePage, pageSize);
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mb-5');
            studioControls.replaceChildren(buttons);
            const children = [];
            if (framesNav) {
                framesNav.classList.add('mt-3');
                children.push(framesNav);
            }
            content.replaceChildren(filterNav, ...children, table);
            this.floatHeader(false);
            const first = pageSize * framePage;
            const last = Math.min(filtered.length, first + pageSize) - 1;
            this.frames(table, first, last, filtered);
        };
        btnFrames.addEventListener('click', resetFramePage);
        // Bulk Frames
        const btnBulkFrames = document.createElement('button');
        btnBulkFrames.textContent = 'Bulk Frames';
        btnBulkFrames.classList.add('btn', 'btn-secondary');
        btnBulkFrames.addEventListener('click', () => {
            const div = document.createElement('div');
            div.classList.add('mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(div);
            this.floatHeader(false);
            this.bulkFrames(div);
        });
        // Industries
        const btnIndustries = document.createElement('button');
        btnIndustries.textContent = 'Industries';
        btnIndustries.classList.add('btn', 'btn-secondary');
        btnIndustries.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.floatHeader(false);
            this.industries(table);
        });
        // Players
        const btnPlayers = document.createElement('button');
        btnPlayers.textContent = 'Players';
        btnPlayers.classList.add('btn', 'btn-secondary');
        btnPlayers.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.floatHeader(false);
            this.players(table);
        });
        // Props
        const btnProps = document.createElement('button');
        btnProps.textContent = 'Props';
        btnProps.classList.add('btn', 'btn-secondary');
        let propPage = 0;
        const resetPropPage = () => {
            const pageSize = 20;
            const onPage = (page: number): void => {
                propPage = page;
                resetPropPage();
            };
            const propNav = createPager(propPage, railroad.props.length, onPage, pageSize);
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mb-5');
            studioControls.replaceChildren(buttons);
            if (propNav) {
                propNav.classList.add('mt-5');
                content.replaceChildren(propNav, table);
            } else {
                table.classList.add('mt-5');
                content.replaceChildren(table);
            }
            this.floatHeader(false);
            const first = pageSize * propPage;
            const last = Math.min(railroad.props.length, first + pageSize) - 1;
            this.props(table, first, last);
        };
        btnProps.addEventListener('click', resetPropPage);
        // Spline Tracks
        const btnSplineTracks = document.createElement('button');
        btnSplineTracks.textContent = 'Spline Tracks';
        btnSplineTracks.classList.add('btn', 'btn-secondary');
        let splineTrackPage = 0;
        const resetSplineTrackPage = () => {
            const pageSize = 20;
            const onPage = (page: number): void => {
                splineTrackPage = page;
                resetSplineTrackPage();
            };
            const splineTrackNav = createPager(splineTrackPage, railroad.splineTracks.length, onPage, pageSize);
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mb-5');
            studioControls.replaceChildren(buttons);
            if (splineTrackNav) {
                splineTrackNav.classList.add('mt-5');
                content.replaceChildren(splineTrackNav, table);
            } else {
                table.classList.add('mt-5');
                content.replaceChildren(table);
            }
            this.floatHeader(false);
            const first = pageSize * splineTrackPage;
            const last = Math.min(railroad.splineTracks.length, first + pageSize) - 1;
            this.splineTracks(table, first, last);
        };
        btnSplineTracks.addEventListener('click', resetSplineTrackPage);
        // Export
        const btnDownload = document.createElement('button');
        const imgDownload = bootstrapIcon('bi-download', 'Download');
        this.btnDownload = btnDownload;
        btnDownload.appendChild(imgDownload);
        btnDownload.classList.add('btn', 'btn-secondary');
        btnDownload.addEventListener('click', () => {
            const gvas = railroadToGvas(this.railroad);
            const blob = gvasToBlob(gvas);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.exportFileName();
            document.body.append(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        });
        // Toggle dark mode
        const btnDark = document.createElement('button');
        btnDark.classList.add('btn', 'btn-secondary');
        btnDark.appendChild(bootstrapIcon('bi-lightbulb', 'Toggle dark mode'));
        btnDark.addEventListener('click', toggleDarkMode);
        buttons.replaceChildren(btnMap, btnDownload, btnDark);
        if (hasFrames) {
            buttons.insertBefore(btnFrames, btnDownload);
            buttons.insertBefore(btnBulkFrames, btnDownload);
        }
        if (hasIndustries) {
            buttons.insertBefore(btnIndustries, btnDownload);
        }
        if (hasPlayers) {
            buttons.insertBefore(btnPlayers, btnDownload);
        }
        if (hasProps) {
            buttons.insertBefore(btnProps, btnDownload);
        }
        if (hasSplineTracks) {
            buttons.insertBefore(btnSplineTracks, btnDownload);
        }
        // Studio controls
        const studioControls = document.createElement('div');
        studioControls.classList.add('studio-controls', 'vstack', 'gap-2');
        studioControls.replaceChildren(buttons, mapButtons);
        headerElement.replaceChildren(header, studioControls);
        layers
            .map((l) => l.listener)
            .filter(Boolean)
            .forEach((l) => l());
        // Version warning
        const saveGameVersionNumber = Number(railroad.saveGame.version);
        const showSaveVersionWarning =
            saveGameVersionNumber < OLDEST_TESTED_SAVE_GAME_VERSION ||
            saveGameVersionNumber > NEWEST_TESTED_SAVE_GAME_VERSION;
        if (showSaveVersionWarning) {
            const warning = `Warning: Save game version ${railroad.saveGame.version} has not been tested.`;
            console.log(warning);
            const headerWarning = document.createElement('h4');
            headerWarning.textContent = warning;
            headerWarning.classList.add('text-warning');
            headerElement.insertBefore(headerWarning, studioControls);
            // headerElement.replaceChildren(header, headerWarning, studioControls);
        }
    }

    private exportFileName() {
        const appendModified = this.modified && !this.filename.match(/modified/);
        const fileExtension = this.filename.match(/(\.[^.]+)?$/)?.[1];
        if (!fileExtension) {
            if (appendModified) return this.filename + '-modified.sav';
            return this.filename + '.sav';
        } else {
            if (!appendModified) return this.filename;
            const beforeDot = this.filename.substring(0, this.filename.length - fileExtension.length);
            return `${beforeDot}-modified${fileExtension}`;
        }
    }

    private floatHeader(float: boolean) {
        const header = document.getElementById('header');
        if (header) {
            header.classList[float ? 'add' : 'remove']('fixed-top', 'm-3');
        }
        const content = document.getElementById('content');
        if (content) {
            if (float) {
                content.classList.replace('pt-1', 'pt-5');
            } else {
                content.classList.replace('pt-5', 'pt-1');
            }
        }
    }

    setMapModified(affectsSplines = false) {
        if (!this.modified) {
            this.modified = true;
            this.btnDownload.classList.replace('btn-secondary', 'btn-warning');
            document.title = this.filename + '* - Railroad Studio';
            const onBeforeUnload = (e: BeforeUnloadEvent) => e.returnValue = 'Changes you made may not be saved.';
            window.addEventListener('beforeunload', onBeforeUnload, {capture: true});
        }
        if (affectsSplines) {
            this.logRadiusGrade();
        }
    }

    private lastLoggedRadius = Infinity;
    private lastLoggedGrade = 0;
    private logRadiusGrade() {
        const catmullRomTracks = this.railroad.splines.filter((spline) =>
            spline.type === SplineType.rail ||
            spline.type === SplineType.rail_deck);
        // Convert Catmull-Rom track splines to hermite curves
        const fromCatmullRom = catmullRomTracks
            .flatMap((spline) => spline.segmentsVisible
                .flatMap((vis, i) => vis ? [catmullRomToHermite(spline, i)] : []));
        // Combine with Hermite track splines
        const hermiteTracks = fromCatmullRom.concat(
            this.railroad.splineTracks
                .filter((spline) =>
                    spline.type &&
                    spline.type.startsWith('rail_') &&
                    !spline.type.includes('switch') &&
                    !spline.type.includes('bumper'))
                .map((spline) => {
                    const {startPoint, startTangent, endPoint, endTangent} = spline;
                    return {startPoint, startTangent, endPoint, endTangent};
                }),
        );
        // Calculate minimum radius
        const minRadius = hermiteTracks
            .map(hermiteToBezier)
            .map((b) => cubicBezierMinRadius(b))
            .map((osculating) => osculating.radius)
            .reduce((p, c) => Math.min(p, c), Infinity);
        if (minRadius !== this.lastLoggedRadius) {
            const text = (minRadius / 100).toFixed(2) + 'm';
            console.log(`Minimum radius: ${text}`);
            this.lastLoggedRadius = minRadius;
        }
        // Calculate maximum grade
        const maxGrade = hermiteTracks
            .map((hermite) => calculateSteepestGrade(hermite))
            .map((g) => g.percentage)
            .reduce((p, c) => Math.max(p, c), 0);
        if (maxGrade !== this.lastLoggedGrade) {
            console.log(`Maximum grade: ${maxGrade.toFixed(2)}%`);
            this.lastLoggedGrade = maxGrade;
        }
    }

    setTitle(title: string) {
        this.header.textContent = title + ' - ' + this.filename;
    }

    private splineTracks(table: HTMLTableElement, first: number, last: number): void {
        this.setTitle('Spline Tracks');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of [
            'ID',
            'Location',
            'Start Point',
            'End Point',
            'Start Tangent',
            'End Tangent',
            'Paint style',
            'Rotation',
            'Switch State',
            'Type',
        ]) {
            const th = document.createElement('th');
            th.textContent = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (let idx = first; idx <= last; idx++) {
            const track = this.railroad.splineTracks[idx];
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // ID
            let td = document.createElement('td');
            td.textContent = String(idx);
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            const setTrackLocation = (location: Vector) => track.location = location;
            td.replaceChildren(editVector(this, track.location, setTrackLocation));
            tr.appendChild(td);
            // Start point
            td = document.createElement('td');
            const setTrackStartPoint = (startPoint: Vector) => track.startPoint = startPoint;
            td.replaceChildren(editVector(this, track.startPoint, setTrackStartPoint));
            tr.appendChild(td);
            // End point
            td = document.createElement('td');
            const setTrackEndPoint = (endPoint: Vector) => track.endPoint = endPoint;
            td.replaceChildren(editVector(this, track.endPoint, setTrackEndPoint));
            tr.appendChild(td);
            // Start tangent
            td = document.createElement('td');
            const setTrackStartTangent = (startTangent: Vector) => track.startTangent = startTangent;
            td.replaceChildren(editVector(this, track.startTangent, setTrackStartTangent));
            tr.appendChild(td);
            // End tangent
            td = document.createElement('td');
            const setTrackEndTangent = (endTangent: Vector) => track.endTangent = endTangent;
            td.replaceChildren(editVector(this, track.endTangent, setTrackEndTangent));
            tr.appendChild(td);
            // Paint style
            td = document.createElement('td');
            const setTrackPaintStyle = (paintStyle: number) => track.paintStyle = paintStyle;
            td.replaceChildren(editNumber(this, track.paintStyle, {min: '0'}, setTrackPaintStyle));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            const setTrackRotation = (rotation: Rotator) => track.rotation = rotation;
            td.replaceChildren(editRotator(this, track.rotation, setTrackRotation));
            tr.appendChild(td);
            // Switch state
            td = document.createElement('td');
            const setTrackSwitchState = (switchState: number) => track.switchState = switchState;
            td.replaceChildren(editNumber(this, track.switchState, {min: '0'}, setTrackSwitchState));
            tr.appendChild(td);
            // Type
            td = document.createElement('td');
            const setTrackType = (type: SplineTrackType) => track.type = type;
            td.replaceChildren(editTrackType(this, track.type as SplineTrackType, setTrackType));
            tr.appendChild(td);
        }
    }

    private frames(table: HTMLTableElement, first: number, last: number, filtered: Frame[]): void {
        this.setTitle('Frames');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        ['Type', 'Name', 'Number', 'State'].forEach((columnHeader, i) => {
            const th = document.createElement('th');
            th.classList.add((i < 3) ? 'col-1' : 'col-auto');
            th.textContent = columnHeader;
            tr.appendChild(th);
        });
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        if (last < 0) {
            // Nothing to see
            return;
        }
        for (let idx = first; idx <= last; idx++) {
            const frame = filtered[idx];
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Type
            let td = document.createElement('td');
            td.textContent = isFrameType(frame.type) ? frameDefinitions[frame.type].name : '';
            tr.appendChild(td);
            // Name
            td = document.createElement('td');
            const setFrameName = (name: GvasText) => frame.name = name;
            td.appendChild(editText(this, frame.name, setFrameName));
            tr.appendChild(td);
            // Number
            td = document.createElement('td');
            const setFrameNumber = (frameNo: GvasText) => frame.number = frameNo;
            td.appendChild(editText(this, frame.number, setFrameNumber));
            tr.appendChild(td);
            // State table
            td = document.createElement('td');
            tr.appendChild(td);
            const table2 = document.createElement('table');
            table2.classList.add('table', 'table-borderless', 'mb-0');
            td.appendChild(table2);
            const tbody2 = document.createElement('tbody');
            table2.appendChild(tbody2);
            const addStat = (text: string, input: Node, title?: string, rowClass?: string) => {
                tr = document.createElement('tr');
                if (rowClass) {
                    tr.classList.add(rowClass);
                }
                td = document.createElement('td');
                td.classList.add('col-2', 'text-nowrap');
                td.textContent = text;
                if (title) td.title = title;
                tr.appendChild(td);
                td = document.createElement('td');
                td.classList.add('col-auto');
                td.appendChild(input);
                tr.appendChild(td);
                tbody2.append(tr);
            };
            // Location
            const setFrameLocation = (location: Vector) => frame.location = location;
            addStat('Location', editVector(this, frame.location, setFrameLocation));
            // Rotation
            const setFrameRotation = (rotation: Rotator) => frame.rotation = rotation;
            addStat('Rotation', editRotator(this, frame.rotation, setFrameRotation));
            // Frame state
            if (isFrameType(frame.type)) {
                const frameDef = frameDefinitions[frame.type];
                const editNumericState = (frame: Frame, key: keyof NumericFrameState) => {
                    if (typeof frame.state[key] === 'undefined') return;
                    const meta = frameStateMetadata[key];
                    if (!meta) return;
                    const {max, min} = frameDef;
                    const maxValue = (max ? max[key] : undefined) ?? 0;
                    const minValue = (min ? min[key] : undefined) ?? 0;
                    const value = Number(frame.state[key]);
                    if (value === minValue && value === maxValue) return;
                    if (value === 0 && minValue === 1) return;
                    let c: string | undefined = undefined;
                    let tooltip: string = key;
                    if (value < minValue || value > maxValue) {
                        c = 'table-warning';
                        tooltip = `Expected ${key} to in range [${minValue}, ${maxValue}]`;
                    }
                    const options: InputTextOptions = {
                        min: String(minValue),
                        max: String(maxValue),
                        step: 'step' in meta && meta.step ? String(meta.step) : undefined,
                    };
                    const displayValue = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
                    const saveValue = (value: number) => frame.state[key] = value;
                    const formatValue = (value: number) => {
                        let result = displayValue(value);
                        if (value !== maxValue && maxValue !== 1) {
                            result += ` / ${maxValue}`;
                        }
                        if ('unit' in meta && meta.unit) {
                            if (typeof meta.unit === 'string') {
                                result += ` ${meta.unit}`;
                            } else {
                                const fuelType = frameDef.coal ? 1 : 0;
                                result += ` ${meta.unit[fuelType]}`;
                            }
                        }
                        if ('type' in meta && meta.type === 'slider') {
                            const percent = 100 * value / maxValue;
                            const display = displayValue(percent).padStart(6) + '%';
                            if (!('unit' in meta && meta.unit) && (maxValue === 1 || maxValue === 100)) {
                                return display;
                            }
                            return `${display} (${result})`;
                        }
                        return result;
                    };
                    let form: Node;
                    if (!('type' in meta && meta.type)) {
                        form = editNumber(this, value, options, saveValue, formatValue);
                    } else if (meta.type === 'slider') {
                        form = editSlider(this, value, options, saveValue, formatValue);
                    } else {
                        const saveString = (value: string) => saveValue(Number(value));
                        const optionDict = Object.fromEntries(Object.entries(meta.type));
                        form = editDropdown(this, String(value), optionDict, saveString);
                    }
                    addStat(meta.name, form, tooltip, c);
                };
                // Configuration
                editNumericState(frame, 'headlightType');
                editNumericState(frame, 'paintType');
                editNumericState(frame, 'smokestackType');
                // Cab controls
                editNumericState(frame, 'regulatorValue');
                editNumericState(frame, 'reverserValue');
                editNumericState(frame, 'brakeValue');
                editNumericState(frame, 'generatorValveValue');
                editNumericState(frame, 'compressorValveValue');
                // Physical state
                editNumericState(frame, 'boilerFireTemp');
                editNumericState(frame, 'boilerFuelAmount');
                editNumericState(frame, 'boilerPressure');
                editNumericState(frame, 'boilerWaterLevel');
                editNumericState(frame, 'boilerWaterTemp');
                editNumericState(frame, 'compressorAirPressure');
                editNumericState(frame, 'sanderAmount');
                editNumericState(frame, 'tenderFuelAmount');
                editNumericState(frame, 'tenderWaterAmount');
                // Marker lights
                editNumericState(frame, 'markerLightsCenterState');
                editNumericState(frame, 'markerLightsFrontLeftState');
                editNumericState(frame, 'markerLightsFrontRightState');
                editNumericState(frame, 'markerLightsRearLeftState');
                editNumericState(frame, 'markerLightsRearRightState');
                // Freight
                if (hasCargoLimits(frame.type)) {
                    const freightType = frame.state.freightType ?? '';
                    const setAmount = (amount: number) => frame.state.freightAmount = amount;
                    const limits: Partial<Record<CargoType, number>> = cargoLimits[frame.type];
                    const limit = isCargoType(freightType) ? limits[freightType] ?? 0 : 0;
                    const max = String(limit);
                    const options: InputTextOptions = {min: '0', max};
                    const form = editNumber(this, frame.state.freightAmount, options, setAmount);
                    if (isCargoType(freightType) &&
                        typeof limits[freightType] !== 'undefined' &&
                        frame.state.freightAmount > limit) {
                        const title = 'Too much freight';
                        const c = 'table-warning';
                        addStat('Freight Amount', form, title, c);
                    } else {
                        addStat('Freight Amount', form);
                    }
                    const allowedCargo = Object.keys(limits) as CargoType[];
                    const setFreightType = (type: GvasString) => {
                        // TODO: Update freight amount limits
                        return frame.state.freightType = type === '' ? null : type;
                    };
                    if (allowedCargo.includes(freightType)) {
                        const entries = allowedCargo.map((t) => [t, cargoTypes[t]] as [string, string]);
                        const typeOptions = Object.fromEntries(entries);
                        const form = editDropdown(this, freightType, typeOptions, setFreightType);
                        addStat('Freight Type', form);
                    } else {
                        const title = `Unexpected freight type ${freightType} for ${frame.type}`;
                        const c = 'table-warning';
                        const form = editString(this, freightType, setFreightType);
                        addStat('Freight Type', form, title, c);
                    }
                }
            }
        }
    }

    private bulkFrames(outerDiv: HTMLDivElement) {
        this.setTitle('Bulk Frames');

        // Move Frame Actions
        const liftFrames = (value: number) => {
            if (this.railroad.frames.length === 0) return;
            this.railroad.frames.forEach((frame: Frame) => {
                frame.location.z += value;
            });
            this.setMapModified();
        };

        // Refill Consumables Action
        const refillFuel = (): void => {
            if (this.railroad.frames.length === 0) return;
            this.railroad.frames.forEach((frame: Frame) => {
                if (!isFrameType(frame.type)) return;
                const {max} = frameDefinitions[frame.type];
                if (typeof max === 'undefined') return;
                if (max.boilerFuelAmount && frame.state.boilerFuelAmount !== max.boilerFuelAmount) {
                    frame.state.boilerFuelAmount = max.boilerFuelAmount;
                    this.setMapModified();
                }
                if (max.tenderFuelAmount && frame.state.tenderFuelAmount !== max.tenderFuelAmount) {
                    frame.state.tenderFuelAmount = max.tenderFuelAmount;
                    this.setMapModified();
                }
            });
        };
        const refillWater = (): void => {
            if (this.railroad.frames.length === 0) return;
            this.railroad.frames.forEach((frame: Frame) => {
                if (!isFrameType(frame.type)) return;
                const {max} = frameDefinitions[frame.type];
                if (typeof max === 'undefined') return;
                if (max.boilerWaterLevel && frame.state.boilerWaterLevel !== max.boilerWaterLevel) {
                    frame.state.boilerWaterLevel = max.boilerWaterLevel;
                    this.setMapModified();
                }
                if (max.tenderWaterAmount && frame.state.tenderWaterAmount !== max.tenderWaterAmount) {
                    frame.state.tenderWaterAmount = max.tenderWaterAmount;
                    this.setMapModified();
                }
            });
        };

        let h3 = document.createElement('h3');
        h3.classList.add('mb-3');
        h3.textContent = 'Move Frames';
        outerDiv.appendChild(h3);

        // Move Frame
        let div = document.createElement('div');
        div.classList.add('row', 'mb-3');
        outerDiv.appendChild(div);
        let label = document.createElement('label');
        label.classList.add('col', 'col-3', 'col-form-label');
        label.textContent = 'Z';
        div.appendChild(label);
        let innerDiv = document.createElement('div');
        innerDiv.classList.add('col-2');
        div.appendChild(innerDiv);
        const btnLiftAll = document.createElement('button');
        btnLiftAll.classList.add('btn', 'btn-secondary');
        btnLiftAll.textContent = 'Lift 5m';
        btnLiftAll.addEventListener('click', () => {
            liftFrames(500);
        });
        innerDiv.appendChild(btnLiftAll);

        const btnFillAll = document.createElement('button');
        btnFillAll.classList.add('btn', 'btn-secondary');
        btnFillAll.textContent = 'Fill';
        btnFillAll.addEventListener('click', () => {
            refillWater();
            refillFuel();
        });
        const btnFillFuel = document.createElement('button');
        btnFillFuel.classList.add('btn', 'btn-secondary');
        btnFillFuel.textContent = 'Fill';
        btnFillFuel.addEventListener('click', () => {
            refillFuel();
        });
        const btnFillWater = document.createElement('button');
        btnFillWater.classList.add('btn', 'btn-secondary');
        btnFillWater.textContent = 'Fill';
        btnFillWater.addEventListener('click', () => {
            refillWater();
        });

        // Fill Consumables
        h3 = document.createElement('h3');
        h3.classList.add('mb-3');
        h3.textContent = 'Fill Consumables';
        outerDiv.appendChild(h3);

        div = document.createElement('div');
        div.classList.add('row', 'mb-3');
        outerDiv.appendChild(div);
        label = document.createElement('label');
        label.classList.add('col', 'col-3', 'col-form-label');
        label.textContent = 'Fill All';
        div.appendChild(label);
        innerDiv = document.createElement('div');
        innerDiv.classList.add('col-2');
        div.appendChild(innerDiv);
        innerDiv.appendChild(btnFillAll);

        div = document.createElement('div');
        div.classList.add('row', 'mb-3');
        outerDiv.appendChild(div);
        label = document.createElement('label');
        label.classList.add('col', 'col-3', 'col-form-label');
        label.textContent = 'Fill Fuel';
        div.appendChild(label);
        innerDiv = document.createElement('div');
        innerDiv.classList.add('col-2');
        div.appendChild(innerDiv);
        innerDiv.appendChild(btnFillFuel);

        div = document.createElement('div');
        div.classList.add('row', 'mb-3');
        outerDiv.appendChild(div);
        label = document.createElement('label');
        label.classList.add('col', 'col-3', 'col-form-label');
        label.textContent = 'Fill Water';
        div.appendChild(label);
        innerDiv = document.createElement('div');
        innerDiv.classList.add('col-2');
        div.appendChild(innerDiv);
        innerDiv.appendChild(btnFillWater);
    }

    private industries(table: HTMLTableElement): void {
        this.setTitle('Industries');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Industry Type', 'Inputs', 'Outputs', 'Location', 'Rotation']) {
            const th = document.createElement('th');
            th.textContent = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const industry of this.railroad.industries) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Industry type
            let td = document.createElement('td');
            if (typeof industry.type === 'number') {
                const setIndustryType = (type: IndustryType) => industry.type = type;
                td.replaceChildren(editIndustryType(this, industry.type, setIndustryType));
            } else if (isIndustryName(industry.type)) {
                const setIndustryName = (name: IndustryName) => industry.type = name;
                td.replaceChildren(editIndustryName(this, industry.type, setIndustryName));
            } else {
                const setIndustryName = (name: GvasString) => industry.type = name;
                td.replaceChildren(editString(this, industry.type, setIndustryName));
                td.classList.add('table-warning');
            }
            tr.appendChild(td);
            // Inputs
            td = document.createElement('td');
            const setIndustryInputs = (inputs: number[]) => industry.inputs = inputs as Quadruplet<number>;
            const industryName = getIndustryName(industry);
            const defaultLabelsI: Quadruplet<string> = [
                'Unknown Input Slot 1',
                'Unknown Input Slot 2',
                'Unknown Input Slot 3',
                'Unknown Input Slot 4',
            ];
            const inputLabels = industryName ? industryInputLabels[industryName] ?? defaultLabelsI : defaultLabelsI;
            td.appendChild(editIndustryProducts(this, 'Input', inputLabels, industry.inputs, setIndustryInputs));
            if (inputLabels === defaultLabelsI && !industry.inputs.every((v) => v === 0)) {
                td.classList.add('table-warning');
            }
            tr.appendChild(td);
            // Outputs
            td = document.createElement('td');
            const setIndustryOutputs = (outputs: number[]) => industry.outputs = outputs as Quadruplet<number>;
            const defaultLabelsO: Quadruplet<string> = [
                'Unknown Output Slot 1',
                'Unknown Output Slot 2',
                'Unknown Output Slot 3',
                'Unknown Output Slot 4',
            ];
            const outputLabels = industryName ? industryOutputLabels[industryName] ?? defaultLabelsO : defaultLabelsO;
            td.appendChild(editIndustryProducts(this, 'Output', outputLabels, industry.outputs, setIndustryOutputs));
            if (outputLabels === defaultLabelsO && !industry.outputs.every((v) => v === 0)) {
                td.classList.add('table-warning');
            }
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            const setIndustryLocation = (location: Vector) => industry.location = location;
            td.replaceChildren(editVector(this, industry.location, setIndustryLocation));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            const setIndustryRotation = (rotation: Rotator) => industry.rotation = rotation;
            td.replaceChildren(editRotator(this, industry.rotation, setIndustryRotation));
            tr.appendChild(td);
        }
    }

    private players(table: HTMLTableElement): void {
        this.setTitle('Players');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Steam ID', 'Name', 'Money', 'XP', 'Location']) {
            const th = document.createElement('th');
            th.textContent = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const player of this.railroad.players) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // ID
            let td = document.createElement('td');
            td.textContent = String(player.id);
            tr.appendChild(td);
            // Name
            td = document.createElement('td');
            td.textContent = String(player.name);
            tr.appendChild(td);
            // Money
            td = document.createElement('td');
            td.appendChild(editNumber(this, player.money, {min: '0'}, (money) => player.money = money));
            tr.appendChild(td);
            // XP
            td = document.createElement('td');
            td.appendChild(editNumber(this, player.xp, {min: '0'}, (xp) => player.xp = xp));
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            if (player.location) {
                const setPlayerLocation = (location: Vector): Vector => player.location = location;
                td.appendChild(editVector(this, player.location, setPlayerLocation));
            }
            tr.appendChild(td);
            // Rotation
            if (player.rotation) {
                td = document.createElement('td');
                const setPlayerRotation = (r: number) => player.rotation = r;
                td.replaceChildren(editNumber(this, player.rotation, {min: '-180', max: '180'}, setPlayerRotation));
                tr.appendChild(td);
            }
        }
    }

    private props(table: HTMLTableElement, first: number, last: number): void {
        this.setTitle('Props');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['ID', 'Name', 'Text', 'Location', 'Rotation', 'Scale']) {
            const th = document.createElement('th');
            th.textContent = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (let idx = first; idx <= last; idx++) {
            const prop = this.railroad.props[idx];
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // ID
            let td = document.createElement('td');
            td.textContent = String(idx);
            tr.appendChild(td);
            // Name
            td = document.createElement('td');
            const setPropName = (name: GvasString): GvasString => prop.name = name;
            td.appendChild(editString(this, prop.name, setPropName));
            tr.appendChild(td);
            // Text
            td = document.createElement('td');
            td.appendChild(editText(this, prop.text, (text) => prop.text = text));
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            const setPropLocation = (location: Vector): Vector => prop.transform.translation = location;
            td.appendChild(editVector(this, prop.transform.translation, setPropLocation));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            const setPropRotation = (rotation: Quaternion) => prop.transform.rotation = rotation;
            td.replaceChildren(editQuaternion(this, prop.transform.rotation, setPropRotation));
            tr.appendChild(td);
            // Scale
            td = document.createElement('td');
            const setPropScale = (scale: Vector) => prop.transform.scale3d = scale;
            td.replaceChildren(editVector(this, prop.transform.scale3d, setPropScale));
            tr.appendChild(td);
        }
    }
}
