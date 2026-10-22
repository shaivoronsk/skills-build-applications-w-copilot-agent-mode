import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input is required'), { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = body;

  if (
    typeof userId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(userId) ||
    typeof teamId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);

  if (!userExists || !teamExists) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }

  return Activity.create({
    user: new Types.ObjectId(userId),
    team: new Types.ObjectId(teamId),
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team input is required'), { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const { name, mascot, members = [] } = body;

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof mascot !== 'string' || !mascot.trim() ||
    !Array.isArray(members) ||
    members.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: members.map((id) => new Types.ObjectId(id)),
  });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1 })
    .lean();

  const goalFocus = user.fitnessGoal?.trim().toLowerCase();
  const activityType = recentActivity?.type.trim().toLowerCase();
  const activityFocus = activityType
    ? ({ run: 'endurance', cycle: 'endurance' }[activityType] ?? activityType)
    : undefined;

  const goalMatches = goalFocus
    ? await Workout.find({ focus: goalFocus }).lean()
    : [];

  const focus = goalMatches.length ? goalFocus : activityFocus;
  const suggestions = goalMatches.length
    ? goalMatches
    : focus
      ? await Workout.find({ focus }).lean()
      : [];

  const reasonParts: string[] = [];
  if (goalFocus && focus === goalFocus) {
    reasonParts.push(`supports your ${goalFocus} goal`);
  }
  if (recentActivity && focus === activityFocus) {
    reasonParts.push(`matches your recent ${recentActivity.type} activity`);
  }

  const reason = reasonParts.length
    ? `${reasonParts.join(' and ')}.`
    : 'Recommended based on your activity history.';

  return suggestions.map((workout) => ({ ...workout, reason }));
}
export { User };
