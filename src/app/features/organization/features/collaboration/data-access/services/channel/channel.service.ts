import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  AddChannelParticipantInput,
  BindChannelTeamInput,
  ChannelOutput,
  ChannelParticipantOutput,
  CreateChannelInput,
  ListChannelsQuery,
  SetChannelParentInput,
  UpdateChannelInput,
} from '@features/organization/features/collaboration/models';

/**
 * Service ChannelService
 * @class ChannelService
 * @extends {HydraApiService}
 *
 * @description
 * Transport boundary for the API's channel endpoints: named group
 * conversations, their participants, their team binding and their
 * parent/child hierarchy.
 *
 * Returns transport types untouched. Every derived-field caveat
 * (`unreadCount` hard-coded to `0`, `isFavorite` false on writes) is the
 * store's problem, not this layer's.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ChannelService extends HydraApiService {
  //#region Properties
  /**
   * Property endpoint
   * @readonly
   *
   * @description
   * Collection endpoint every channel route is derived from.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly endpoint: string = '/api/channels';
  //#endregion

  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists the channels the acting member participates in.
   *
   * `isArchived` is only sent when the caller sets it: the server treats the
   * filter as presence-based, so omitting it returns archived and unarchived
   * alike, while sending a falsy empty value would silently narrow to
   * unarchived. `buildParams` drops `undefined`, so leaving the key out is
   * the correct way to say "no filter".
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ListChannelsQuery} query - Organization scope, archive filter and paging.
   *
   * @returns {Observable<HydraCollection<ChannelOutput>>} The matching channels.
   */
  public list(query: ListChannelsQuery): Observable<HydraCollection<ChannelOutput>> {
    return this.getCollection<ChannelOutput>(this.endpoint, {
      page: query.page,
      itemsPerPage: query.itemsPerPage,
      params: {
        organization: query.organization,
        ...(query.isArchived === undefined ? {} : { isArchived: query.isArchived }),
      },
    });
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Reads one channel.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   *
   * @returns {Observable<ChannelOutput>} The channel.
   */
  public get(channelId: string): Observable<ChannelOutput> {
    return this.getOne<ChannelOutput>(`${this.endpoint}/${channelId}`);
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a named channel.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {CreateChannelInput} input - Organization and name.
   *
   * @returns {Observable<ChannelOutput>} The created channel.
   */
  public create(input: CreateChannelInput): Observable<ChannelOutput> {
    return this.post<CreateChannelInput, ChannelOutput>(this.endpoint, input);
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Renames and/or archives a channel. Omitted keys are left untouched.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   * @param {UpdateChannelInput} input - Merge payload.
   *
   * @returns {Observable<ChannelOutput>} The updated channel.
   */
  public update(channelId: string, input: UpdateChannelInput): Observable<ChannelOutput> {
    return this.patch<UpdateChannelInput, ChannelOutput>(`${this.endpoint}/${channelId}`, input);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a channel. Answers `204` with no body.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   *
   * @returns {Observable<void>} Completion.
   */
  public remove(channelId: string): Observable<void> {
    return this.delete(`${this.endpoint}/${channelId}`);
  }

  /**
   * Method listParticipants
   * @method listParticipants
   *
   * @description
   * Lists a channel's participants.
   *
   * Pagination is disabled on this endpoint: there is no `view` and
   * `totalItems` equals the row count, so do not render a paginator for it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   *
   * @returns {Observable<HydraCollection<ChannelParticipantOutput>>} Every participant.
   */
  public listParticipants(
    channelId: string,
  ): Observable<HydraCollection<ChannelParticipantOutput>> {
    return this.getCollection<ChannelParticipantOutput>(
      `${this.endpoint}/${channelId}/participants`,
    );
  }

  /**
   * Method addParticipant
   * @method addParticipant
   *
   * @description
   * Adds a member to a channel.
   *
   * Re-adding an existing participant answers `201` built from the request
   * rather than from storage, so the returned `role` and `addedAt` may not be
   * what is actually stored. Refetch the list when those matter.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   * @param {AddChannelParticipantInput} input - Member and optional role.
   *
   * @returns {Observable<ChannelParticipantOutput>} The participation record.
   */
  public addParticipant(
    channelId: string,
    input: AddChannelParticipantInput,
  ): Observable<ChannelParticipantOutput> {
    return this.post<AddChannelParticipantInput, ChannelParticipantOutput>(
      `${this.endpoint}/${channelId}/participants`,
      input,
    );
  }

  /**
   * Method removeParticipant
   * @method removeParticipant
   *
   * @description
   * Removes a member from a channel. Idempotent — removing an absent member
   * is not an error.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   * @param {string} memberId - Bare organization-member UUID.
   *
   * @returns {Observable<void>} Completion.
   */
  public removeParticipant(channelId: string, memberId: string): Observable<void> {
    return this.delete(`${this.endpoint}/${channelId}/participants/${memberId}`);
  }

  /**
   * Method bindTeam
   * @method bindTeam
   *
   * @description
   * Binds the channel to an organization team, or unbinds it when `teamId` is
   * `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   * @param {BindChannelTeamInput} input - Team to bind, or `null` to unbind.
   *
   * @returns {Observable<ChannelOutput>} The updated channel.
   */
  public bindTeam(channelId: string, input: BindChannelTeamInput): Observable<ChannelOutput> {
    return this.patch<BindChannelTeamInput, ChannelOutput>(
      `${this.endpoint}/${channelId}/team`,
      input,
    );
  }

  /**
   * Method setParent
   * @method setParent
   *
   * @description
   * Nests the channel under another, or detaches it when `parentChannelId` is
   * `null`. Answers `409` on a cycle or depth violation and `422` on an
   * invalid parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} channelId - Bare channel UUID.
   * @param {SetChannelParentInput} input - Parent to nest under, or `null`.
   *
   * @returns {Observable<ChannelOutput>} The updated channel.
   */
  public setParent(channelId: string, input: SetChannelParentInput): Observable<ChannelOutput> {
    return this.patch<SetChannelParentInput, ChannelOutput>(
      `${this.endpoint}/${channelId}/parent`,
      input,
    );
  }
  //#endregion
}
