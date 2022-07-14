import * as React from 'react';
import {Object} from 'ts-toolbelt';
import {VError} from 'verror';
import positionalArraySorter from '@neos-project/positional-array-sorter';

import {useGlobalRegistry} from '@sitegeist/archaeopteryx-neos-bridge';

import {IProcess} from '../../framework';

import {ILink, ILinkOptions} from './Link';
import {useEditorState} from '../Editor';

interface LinkTypeStaticProps<OptionsType extends object = {}> {
    link?: ILink
    options: Object.Partial<OptionsType, 'deep'>
}
interface LinkTypeProps<ModelType = any, OptionsType extends object = {}> {
    link: ILink
    model: ModelType
    options: Object.Partial<OptionsType, 'deep'>
}

export interface ILinkType<ModelType = any, OptionsType extends object = {}> {
    id: string
    supportedLinkOptions: (keyof ILinkOptions)[]
    isSuitableFor: (link: ILink) => boolean

    useResolvedModel: (link: ILink) => IProcess<ModelType>
    convertModelToLink: (model: ModelType) => ILink

    TabHeader: React.FC<LinkTypeStaticProps<OptionsType>>
    LoadingPreview: React.FC<LinkTypeStaticProps<OptionsType>>
    Preview: React.FC<LinkTypeProps<ModelType, OptionsType>>
    LoadingEditor: React.FC<LinkTypeStaticProps<OptionsType>>
    Editor: React.FC<Object.Nullable<LinkTypeProps<ModelType, OptionsType>, 'link' | 'model'>>
}

export interface ILinkTypeFactoryApi {
    createError: (message: string, cause?: Error) => Error
}

export function makeLinkType<ModelType = any, OptionsType extends object = {}>(
    id: string,
    createOptions: (factoryApi: ILinkTypeFactoryApi) => Object.Optional<
        Omit<ILinkType<ModelType, OptionsType>, 'id'>,
        'supportedLinkOptions' | 'Icon' | 'Title' | 'LoadingPreview' | 'LoadingEditor'
    >
): ILinkType<ModelType, OptionsType> {
    const createError = (message: string, cause?: Error) => cause
        ? new VError(cause, `[${id}]: ${message}`)
        : new VError(`[${id}]: ${message}`)
    ;
    const options = createOptions({createError});

    return {
        id,
        supportedLinkOptions: [],
        ...options,
        LoadingPreview: options.LoadingPreview ?? (() => React.createElement(
            'div',
            {},
            'Loading...'
        )),
        LoadingEditor: options.LoadingEditor ?? (() => React.createElement(
            'div',
            {},
            'Loading...'
        ))
    };
}

export function useLinkTypes(): ILinkType[] {
    const globalRegistry = useGlobalRegistry();
    return globalRegistry.get('@sitegeist/archaeopteryx/link-types')?.getAllAsList() ?? [];
}

export function useLinkTypeForHref(href: null | string): null | ILinkType {
    const linkTypes = useLinkTypes();
    const result = React.useMemo(() => {
        if (href === null) {
            return null;
        }

        for (const linkType of [...linkTypes].reverse()) {
            if (linkType.isSuitableFor({href})) {
                return linkType;
            }
        }

        return null;
    }, [linkTypes, href]);

    return result;
}

export function useSortedAndFilteredLinkTypes(): ILinkType[] {
    const linkTypes = useLinkTypes();
    const {editorOptions} = useEditorState();

    const linkTypesAndEditorOptions = linkTypes.map(
        (linkType) => ({
            linkType,
            options: editorOptions.linkTypes?.[linkType.id]
        })
    )

    const sortedLinkTypesViaEditorOptionsPosition = positionalArraySorter(
        linkTypesAndEditorOptions,
        // badly typed
        ({options}) => options?.position
    )

    const filteredLinkTypes = sortedLinkTypesViaEditorOptionsPosition.filter(
        ({options}) => (options && "enabled" in options) ? options.enabled : true
    )
    
    return filteredLinkTypes.map(
        ({linkType}) => linkType
    );
}
